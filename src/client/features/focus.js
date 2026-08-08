import * as TimerTools from "../../domain/timer.js";
import * as PomodoroTools from "../../domain/pomodoro.js";
import * as TimerStateTools from "../../domain/timer-state.js";
import * as SoundTools from "../../domain/sound.js";
import { MAX_TIMER_MINUTES, MIN_TIMER_MINUTES, elements, restoredTimerResult, saveFocusSessions, state } from "../core/context.js";
import { renderSessionData } from "./history.js";
import { deliverReminder } from "./reminders.js";

let timerAudioContext = null;

function updateSoundControls() {
  const volumePercent = Math.round(state.sound.volume * 100);

  elements.soundMutedInput.checked = state.sound.muted;
  elements.soundVolumeInput.value = String(volumePercent);
  elements.soundVolumeOutput.value = volumePercent + "%";
  elements.soundVolumeInput.disabled = state.sound.muted;
  elements.soundPreviewSelect.disabled = state.sound.muted;
  elements.previewSoundButton.disabled = state.sound.muted;
}

function setSoundPlaybackStatus(message, statusType) {
  elements.soundPlaybackStatus.textContent = message;
  elements.soundPlaybackStatus.classList.toggle(
    "is-success",
    statusType === "success"
  );
  elements.soundPlaybackStatus.classList.toggle(
    "is-error",
    statusType === "error"
  );
}

function persistSoundSettings() {
  const result = SoundTools.saveSoundSettings(
    localStorage,
    state.sound
  );

  if (!result.ok) {
    console.error("保存提示音设置失败：", result.error);
  }
}

function getTimerAudioContext() {
  if (timerAudioContext !== null) {
    return timerAudioContext;
  }

  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  timerAudioContext = new AudioContextClass();
  return timerAudioContext;
}

async function prepareTimerSounds() {
  const audioContext = getTimerAudioContext();

  if (audioContext === null) {
    throw new Error("当前浏览器不支持 Web Audio API。");
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  return audioContext;
}

function scheduleCanonVoice(
  audioContext,
  destination,
  frequency,
  startAt,
  duration,
  voiceOptions
) {
  const oscillator = audioContext.createOscillator();
  const noteGain = audioContext.createGain();
  const attackEnd = startAt + 0.035;
  const noteEnd = startAt + duration;

  oscillator.type = voiceOptions.waveform;
  oscillator.frequency.setValueAtTime(
    frequency * voiceOptions.frequencyRatio,
    startAt
  );
  noteGain.gain.setValueAtTime(0.0001, startAt);
  noteGain.gain.exponentialRampToValueAtTime(
    voiceOptions.gain,
    attackEnd
  );
  noteGain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
  oscillator.connect(noteGain);
  noteGain.connect(destination);
  oscillator.start(startAt);
  oscillator.stop(noteEnd + 0.02);
}

function scheduleCanonCue(audioContext, cue) {
  const masterGain = audioContext.createGain();
  const cueStart = audioContext.currentTime + 0.04;

  masterGain.gain.value = state.sound.volume * 0.34;
  masterGain.connect(audioContext.destination);

  cue.notes.forEach(function (note) {
    const noteStart = cueStart + note.start;

    scheduleCanonVoice(
      audioContext,
      masterGain,
      note.frequency,
      noteStart,
      note.duration,
      {
        waveform: "sine",
        frequencyRatio: 1,
        gain: 0.72
      }
    );
    scheduleCanonVoice(
      audioContext,
      masterGain,
      note.frequency,
      noteStart,
      note.duration * 0.82,
      {
        waveform: "triangle",
        frequencyRatio: 2,
        gain: 0.08
      }
    );
  });
}

function warmUpTimerSounds() {
  if (state.sound.muted) {
    return;
  }

  prepareTimerSounds().catch(function (error) {
    console.warn("提示音准备失败：", error);
    setSoundPlaybackStatus("浏览器无法准备提示音", "error");
  });
}

async function playTimerSound(eventName, announcePlayback) {
  if (state.sound.muted) {
    if (announcePlayback) {
      setSoundPlaybackStatus("提示音当前已静音", "");
    }
    return;
  }

  try {
    if (announcePlayback) {
      setSoundPlaybackStatus("正在准备提示音...", "");
    }

    const audioContext = await prepareTimerSounds();
    const cue = SoundTools.getSoundCue(eventName);

    if (cue === null) {
      throw new Error("没有找到对应的提示音。");
    }

    scheduleCanonCue(audioContext, cue);

    if (announcePlayback) {
      const eventLabel =
        SoundTools.getSoundEventLabel(eventName);
      setSoundPlaybackStatus(
        "正在试听：" + cue.label + " · " + eventLabel,
        "success"
      );
    }
  } catch (error) {
    console.warn("播放提示音失败：", error);
    setSoundPlaybackStatus(
      error.message || "提示音播放失败，请稍后重试",
      "error"
    );
  }
}

function timerHasProgress() {
  const totalSeconds = getCurrentPhaseTotalSeconds();

  return state.timer.remainingSeconds > 0 &&
    state.timer.remainingSeconds < totalSeconds;
}

function getCurrentPhaseTotalSeconds() {
  const activeBreakMinutes = PomodoroTools.getBreakDurationMinutes(
    state.timer.isLongBreak,
    state.timer.breakMinutes,
    state.timer.longBreakMinutes
  );

  return PomodoroTools.getPhaseDurationSeconds(
    state.timer.phase,
    state.timer.selectedMinutes,
    activeBreakMinutes
  );
}

function updateTimerCycleDisplay() {
  const completed = state.timer.completedFocusesInCycle;
  const target = state.timer.focusesPerLongBreak;

  elements.timerCycleStatus.textContent =
    "本轮 " + completed + " / " + target;
  elements.timerCycleHint.textContent =
    "完成 " + target + " 轮后进入长休息";

  while (elements.timerCycleIndicators.children.length < target) {
    elements.timerCycleIndicators.appendChild(
      document.createElement("span")
    );
  }

  while (elements.timerCycleIndicators.children.length > target) {
    elements.timerCycleIndicators.lastElementChild.remove();
  }

  Array.from(elements.timerCycleIndicators.children).forEach(function (
    indicator,
    index
  ) {
    indicator.classList.toggle("is-completed", index < completed);
  });
}

function persistTimerState() {
  const result = TimerStateTools.saveTimerState(
    localStorage,
    state.timer
  );

  if (!result.ok) {
    console.error("保存计时状态失败：", result.error);
  }
}

function updateDurationButtons() {
  elements.durationButtons.forEach(function (button) {
    const buttonMinutes = Number(button.dataset.minutes);
    button.classList.toggle(
      "is-active",
      buttonMinutes === state.timer.selectedMinutes
    );
  });
}

function updateTimerControls() {
  const settingsLocked = state.timer.isRunning || timerHasProgress();
  const totalSeconds = getCurrentPhaseTotalSeconds();
  const isBreak = state.timer.phase === "break";

  elements.timerPanel.classList.toggle("is-running", state.timer.isRunning);
  elements.timerPanel.classList.toggle("is-break", isBreak);
  elements.timerPlanSelect.disabled = settingsLocked || isBreak;
  elements.customMinutesInput.disabled = settingsLocked || isBreak;
  elements.breakMinutesInput.disabled = settingsLocked;
  elements.longBreakMinutesInput.disabled = settingsLocked;
  elements.focusesPerLongBreakInput.disabled = settingsLocked;
  elements.skipBreakButton.hidden = !isBreak;
  elements.timerPhaseBadge.textContent = isBreak
    ? (state.timer.isLongBreak ? "长休息" : "休息")
    : "专注";
  updateTimerCycleDisplay();

  elements.durationButtons.forEach(function (button) {
    button.disabled = settingsLocked || isBreak;
  });

  elements.startTimerButton.disabled = state.timer.isRunning;
  elements.pauseTimerButton.disabled = !state.timer.isRunning;

  if (state.timer.isRunning) {
    elements.startTimerButton.textContent = "进行中";
  } else if (state.timer.remainingSeconds === 0) {
    elements.startTimerButton.textContent = "再次开始";
  } else if (state.timer.remainingSeconds < totalSeconds) {
    elements.startTimerButton.textContent = "继续";
  } else {
    elements.startTimerButton.textContent = isBreak ? "开始休息" : "开始";
  }
}

function updateTimerDisplay() {
  elements.timerDisplay.textContent =
    TimerTools.formatTimer(state.timer.remainingSeconds);
  updateTimerControls();
}

function setTimerDuration(minutes) {
  if (
    state.timer.phase !== "focus" ||
    state.timer.isRunning ||
    timerHasProgress()
  ) {
    return;
  }

  state.timer.selectedMinutes = minutes;
  state.timer.remainingSeconds = minutes * 60;
  state.timer.completionRecorded = false;
  elements.customMinutesInput.value = String(minutes);
  elements.timerStatus.textContent = "准备开始 · " + minutes + " 分钟";
  updateDurationButtons();
  updateTimerDisplay();
  persistTimerState();
}

function stopTimerInterval() {
  if (state.timer.intervalId !== null) {
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
  }
}

function syncRemainingSeconds() {
  if (state.timer.endAt === null) {
    return;
  }

  state.timer.remainingSeconds = TimerTools.calculateRemainingSeconds(
    state.timer.endAt,
    Date.now()
  );
}

function recordCompletedFocusSession() {
  const selectedPlan = state.plans.find(function (plan) {
    return String(plan.id) === state.timer.selectedPlanId;
  });

  const focusSession = {
    id: Date.now(),
    planId: selectedPlan ? selectedPlan.id : null,
    planTitle: selectedPlan ? selectedPlan.title : "自由专注",
    plannedMinutes: state.timer.selectedMinutes,
    actualSeconds: state.timer.selectedMinutes * 60,
    completedAt: new Date().toISOString()
  };

  state.focusSessions.push(focusSession);
  saveFocusSessions();
  renderSessionData();

  return focusSession;
}

function finishTimer() {
  if (
    state.timer.phase === "focus" &&
    state.timer.completionRecorded
  ) {
    return;
  }

  stopTimerInterval();
  state.timer.isRunning = false;
  state.timer.endAt = null;
  state.timer.remainingSeconds = 0;

  if (state.timer.phase === "focus") {
    state.timer.completionRecorded = true;
    const completedSession = recordCompletedFocusSession();

    deliverReminder(
      "专注计时完成",
      completedSession.plannedMinutes + " 分钟专注已完成：" +
        completedSession.planTitle,
      "focus-timer-complete",
      { targetPage: "focus" }
    );
    playTimerSound("focusComplete");
    state.timer.completedFocusesInCycle += 1;
    const useLongBreak = PomodoroTools.shouldUseLongBreak(
      state.timer.completedFocusesInCycle,
      state.timer.focusesPerLongBreak
    );

    if (useLongBreak) {
      state.timer.completedFocusesInCycle = 0;
    }

    prepareBreakPhase(useLongBreak);

    if (state.timer.autoStartBreak) {
      startTimer();
    }
    return;
  }

  const completedBreakSound = state.timer.isLongBreak
    ? "longBreakComplete"
    : "shortBreakComplete";

  deliverReminder(
    "休息结束",
    "休息完成，可以开始下一轮专注。",
    "focus-break-complete",
    { targetPage: "focus" }
  );
  playTimerSound(completedBreakSound);
  prepareFocusPhase("休息完成 · 准备下一轮专注");

  if (state.timer.autoStartFocus) {
    startTimer();
  }
}

function prepareBreakPhase(isLongBreak) {
  stopTimerInterval();
  state.timer.phase = "break";
  state.timer.isLongBreak = Boolean(isLongBreak);
  state.timer.isRunning = false;
  state.timer.endAt = null;
  const breakMinutes = PomodoroTools.getBreakDurationMinutes(
    state.timer.isLongBreak,
    state.timer.breakMinutes,
    state.timer.longBreakMinutes
  );
  state.timer.remainingSeconds = breakMinutes * 60;
  elements.timerStatus.textContent =
    "专注完成 · 准备" +
      (state.timer.isLongBreak ? "长休息 " : "休息 ") +
      breakMinutes + " 分钟";
  updateTimerDisplay();
  persistTimerState();
}

function prepareFocusPhase(statusMessage) {
  stopTimerInterval();
  state.timer.phase = "focus";
  state.timer.isLongBreak = false;
  state.timer.isRunning = false;
  state.timer.endAt = null;
  state.timer.remainingSeconds = state.timer.selectedMinutes * 60;
  state.timer.completionRecorded = false;
  elements.timerStatus.textContent = statusMessage ||
    "准备开始 · " + state.timer.selectedMinutes + " 分钟";
  updateTimerDisplay();
  persistTimerState();
}

function tickTimer() {
  syncRemainingSeconds();

  if (state.timer.remainingSeconds === 0) {
    finishTimer();
    return;
  }

  updateTimerDisplay();
}

function startTimer() {
  if (state.timer.isRunning) {
    return;
  }

  warmUpTimerSounds();

  if (state.timer.remainingSeconds === 0) {
    state.timer.remainingSeconds = getCurrentPhaseTotalSeconds();

    if (state.timer.phase === "focus") {
      state.timer.completionRecorded = false;
    }
  }

  state.timer.isRunning = true;
  state.timer.endAt = Date.now() + state.timer.remainingSeconds * 1000;
  elements.timerStatus.textContent = state.timer.phase === "break"
    ? "休息进行中"
    : "专注进行中";
  updateTimerDisplay();
  persistTimerState();
  state.timer.intervalId = setInterval(tickTimer, 250);
}

function pauseTimer() {
  if (!state.timer.isRunning) {
    return;
  }

  syncRemainingSeconds();
  stopTimerInterval();
  state.timer.isRunning = false;
  state.timer.endAt = null;
  elements.timerStatus.textContent =
    "已暂停 · 剩余 " +
      TimerTools.formatTimer(state.timer.remainingSeconds);
  updateTimerDisplay();
  persistTimerState();
}

function resetTimer() {
  stopTimerInterval();
  state.timer.isRunning = false;
  state.timer.endAt = null;
  state.timer.remainingSeconds = getCurrentPhaseTotalSeconds();

  if (state.timer.phase === "focus") {
    state.timer.completionRecorded = false;
  }
  elements.timerStatus.textContent =
    (state.timer.phase === "break" ? "准备休息 · " : "准备开始 · ") +
      (state.timer.phase === "break"
        ? PomodoroTools.getBreakDurationMinutes(
          state.timer.isLongBreak,
          state.timer.breakMinutes,
          state.timer.longBreakMinutes
        )
        : state.timer.selectedMinutes) +
      " 分钟";
  updateTimerDisplay();
  persistTimerState();
}

function handleCustomMinutesChange() {
  const minutes = TimerTools.getValidMinutes(
    elements.customMinutesInput.value,
    MIN_TIMER_MINUTES,
    MAX_TIMER_MINUTES
  );

  if (minutes === null) {
    elements.customMinutesInput.setCustomValidity("请输入 1 到 180 之间的整数");
    elements.customMinutesInput.reportValidity();
    elements.customMinutesInput.value = String(state.timer.selectedMinutes);
    elements.customMinutesInput.setCustomValidity("");
    return;
  }

  setTimerDuration(minutes);
}

function handleBreakMinutesChange() {
  const canUpdateCurrentBreak =
    state.timer.phase === "break" &&
    !state.timer.isLongBreak &&
    !state.timer.isRunning &&
    !timerHasProgress();
  const minutes = PomodoroTools.getValidBreakMinutes(
    elements.breakMinutesInput.value
  );

  if (minutes === null) {
    elements.breakMinutesInput.setCustomValidity(
      "请输入 1 到 60 之间的整数。"
    );
    elements.breakMinutesInput.reportValidity();
    elements.breakMinutesInput.value = String(state.timer.breakMinutes);
    elements.breakMinutesInput.setCustomValidity("");
    return;
  }

  state.timer.breakMinutes = minutes;

  if (canUpdateCurrentBreak) {
    state.timer.remainingSeconds = minutes * 60;
    elements.timerStatus.textContent = "准备休息 · " + minutes + " 分钟";
  }

  updateTimerDisplay();
  persistTimerState();
}

function handleLongBreakMinutesChange() {
  const canUpdateCurrentBreak =
    state.timer.phase === "break" &&
    state.timer.isLongBreak &&
    !state.timer.isRunning &&
    !timerHasProgress();
  const minutes = PomodoroTools.getValidBreakMinutes(
    elements.longBreakMinutesInput.value
  );

  if (minutes === null) {
    elements.longBreakMinutesInput.setCustomValidity(
      "请输入 1 到 60 之间的整数。"
    );
    elements.longBreakMinutesInput.reportValidity();
    elements.longBreakMinutesInput.value =
      String(state.timer.longBreakMinutes);
    elements.longBreakMinutesInput.setCustomValidity("");
    return;
  }

  state.timer.longBreakMinutes = minutes;

  if (canUpdateCurrentBreak) {
    state.timer.remainingSeconds = minutes * 60;
    elements.timerStatus.textContent =
      "准备长休息 · " + minutes + " 分钟";
  }

  updateTimerDisplay();
  persistTimerState();
}

function handleFocusesPerLongBreakChange() {
  const focuses = PomodoroTools.getValidFocusesPerLongBreak(
    elements.focusesPerLongBreakInput.value
  );

  if (focuses === null) {
    elements.focusesPerLongBreakInput.value =
      String(state.timer.focusesPerLongBreak);
    return;
  }

  state.timer.focusesPerLongBreak = focuses;

  if (state.timer.completedFocusesInCycle >= focuses) {
    state.timer.completedFocusesInCycle = 0;
  }

  updateTimerCycleDisplay();
  persistTimerState();
}

function skipBreak() {
  if (state.timer.phase !== "break") {
    return;
  }

  prepareFocusPhase("已跳过休息 · 准备下一轮专注");
}

function restoreTimerInterface() {
  elements.customMinutesInput.value = String(state.timer.selectedMinutes);
  elements.breakMinutesInput.value = String(state.timer.breakMinutes);
  elements.longBreakMinutesInput.value =
    String(state.timer.longBreakMinutes);
  elements.focusesPerLongBreakInput.value =
    String(state.timer.focusesPerLongBreak);
  elements.autoStartBreakInput.checked = state.timer.autoStartBreak;
  elements.autoStartFocusInput.checked = state.timer.autoStartFocus;
  updateDurationButtons();

  if (restoredTimerResult.expired) {
    finishTimer();
    return;
  }

  if (state.timer.isRunning) {
    elements.timerStatus.textContent = state.timer.phase === "break"
      ? "休息进行中"
      : "专注进行中";
    updateTimerDisplay();
    state.timer.intervalId = setInterval(tickTimer, 250);
    return;
  }

  const phaseMinutes = state.timer.phase === "break"
    ? PomodoroTools.getBreakDurationMinutes(
      state.timer.isLongBreak,
      state.timer.breakMinutes,
      state.timer.longBreakMinutes
    )
    : state.timer.selectedMinutes;
  elements.timerStatus.textContent = timerHasProgress()
    ? "已暂停 · 剩余 " +
      TimerTools.formatTimer(state.timer.remainingSeconds)
    : (state.timer.phase === "break" ? "准备休息 · " : "准备开始 · ") +
      phaseMinutes + " 分钟";
  updateTimerDisplay();
}

function bindFocusEvents() {
  elements.timerPlanSelect.addEventListener("change", function () {
    state.timer.selectedPlanId = elements.timerPlanSelect.value;
    persistTimerState();
  });
  elements.durationButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setTimerDuration(Number(button.dataset.minutes));
    });
  });
  elements.customMinutesInput.addEventListener("change", handleCustomMinutesChange);
  elements.breakMinutesInput.addEventListener("change", handleBreakMinutesChange);
  elements.longBreakMinutesInput.addEventListener(
    "change",
    handleLongBreakMinutesChange
  );
  elements.focusesPerLongBreakInput.addEventListener(
    "change",
    handleFocusesPerLongBreakChange
  );
  elements.autoStartBreakInput.addEventListener("change", function () {
    state.timer.autoStartBreak = elements.autoStartBreakInput.checked;
    persistTimerState();
  });
  elements.autoStartFocusInput.addEventListener("change", function () {
    state.timer.autoStartFocus = elements.autoStartFocusInput.checked;
    persistTimerState();
  });
  elements.soundMutedInput.addEventListener("change", function () {
    state.sound.muted = elements.soundMutedInput.checked;
    updateSoundControls();
    persistSoundSettings();
    if (state.sound.muted) {
      setSoundPlaybackStatus("提示音已静音", "");
    } else {
      setSoundPlaybackStatus("提示音已开启", "success");
      warmUpTimerSounds();
    }
  });
  elements.soundVolumeInput.addEventListener("input", function () {
    state.sound.volume = SoundTools.normalizeVolume(
      Number(elements.soundVolumeInput.value) / 100
    );
    updateSoundControls();
  });
  elements.soundVolumeInput.addEventListener("change", persistSoundSettings);
  elements.previewSoundButton.addEventListener("click", function () {
    playTimerSound(elements.soundPreviewSelect.value, true);
  });
  elements.startTimerButton.addEventListener("click", startTimer);
  elements.pauseTimerButton.addEventListener("click", pauseTimer);
  elements.resetTimerButton.addEventListener("click", resetTimer);
  elements.skipBreakButton.addEventListener("click", skipBreak);
}
export {
  bindFocusEvents,
  handleBreakMinutesChange,
  handleCustomMinutesChange,
  handleFocusesPerLongBreakChange,
  handleLongBreakMinutesChange,
  pauseTimer,
  persistSoundSettings,
  persistTimerState,
  playTimerSound,
  resetTimer,
  restoreTimerInterface,
  setSoundPlaybackStatus,
  setTimerDuration,
  skipBreak,
  startTimer,
  stopTimerInterval,
  updateDurationButtons,
  updateSoundControls,
  updateTimerDisplay,
  warmUpTimerSounds
};
