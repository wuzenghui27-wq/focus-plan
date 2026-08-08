import * as PlanTools from "../../domain/plans.js";
import * as PlanFormTools from "../../domain/plan-form.js";
import * as UndoTools from "../../domain/undo.js";
import * as RecurrenceTools from "../../domain/recurrence.js";
import * as ReminderTools from "../../domain/reminders.js";
import * as TextTools from "../../domain/text.js";
import * as SubtaskTools from "../../domain/subtasks.js";
import { PRIORITY_LABELS, REMINDER_LABELS, REPEAT_LABELS, elements, savePlans, state } from "../core/context.js";
import { formatDateTime, isPlanOverdue } from "../core/view-helpers.js";
import { persistTimerState } from "./focus.js";
import { navigateToPage } from "./navigation.js";

function updatePlanCharacterCount(input, output, maximum) {
  const count = PlanFormTools.getCharacterCount(
    input.value,
    maximum
  );

  output.textContent = count.label;
  output.classList.toggle("is-near-limit", count.nearLimit);
}

function updatePlanFormCounters() {
  updatePlanCharacterCount(
    elements.planTitleInput,
    elements.planTitleCount,
    PlanFormTools.TITLE_MAX_LENGTH
  );
  updatePlanCharacterCount(
    elements.planNotesInput,
    elements.planNotesCount,
    PlanFormTools.NOTES_MAX_LENGTH
  );
}

function clearPlanFormError() {
  elements.planFormError.hidden = true;
  elements.planFormError.textContent = "";
  elements.planTitleInput.removeAttribute("aria-invalid");
  elements.planDueAtInput.removeAttribute("aria-invalid");
}

function showPlanFormError(validation) {
  const field = validation.field === "dueAt"
    ? elements.planDueAtInput
    : elements.planTitleInput;

  clearPlanFormError();
  elements.planFormError.textContent = validation.message;
  elements.planFormError.hidden = false;
  field.setAttribute("aria-invalid", "true");
  field.focus();
}

function updatePlanTimeControls() {
  const hasDueAt = elements.planDueAtInput.value !== "";
  elements.planReminderMinutesInput.disabled = !hasDueAt;

  if (!hasDueAt) {
    elements.planReminderMinutesInput.value = "0";
  }
}

function showPlanForm(mode) {
  const isEditing = mode === "edit";
  elements.planFormHeading.textContent = isEditing
    ? "编辑计划"
    : "创建计划";
  elements.savePlanButton.textContent = isEditing
    ? "保存修改"
    : "保存计划";
  elements.createPlanButtonLabel.textContent = isEditing
    ? "编辑中"
    : "填写中";
  elements.createPlanButton.disabled = true;
  elements.planForm.hidden = false;
  elements.planFormBackdrop.hidden = false;
  elements.emptyMessage.hidden = true;
  document.body.classList.add("plan-form-open");
  updatePlanFormCounters();
  updatePlanTimeControls();
  clearPlanFormError();
}

function openCreatePlanForm() {
  state.editingPlanId = null;
  elements.planForm.reset();
  showPlanForm("create");
  elements.planTitleInput.focus();
}

function openEditPlanForm(plan) {
  state.editingPlanId = plan.id;
  elements.planTitleInput.value = plan.title;
  elements.planPriorityInput.value = plan.priority;
  elements.planTagInput.value = plan.tag;
  elements.planDueAtInput.value = plan.dueAt;
  elements.planRepeatInput.value = plan.repeat;
  elements.planReminderMinutesInput.value =
    String(plan.reminderMinutes);
  elements.planNotesInput.value = plan.notes;
  showPlanForm("edit");
  elements.planTitleInput.focus();
  elements.planTitleInput.select();
}

function closePlanForm() {
  state.editingPlanId = null;
  elements.planForm.reset();
  elements.planForm.hidden = true;
  elements.planFormBackdrop.hidden = true;
  elements.createPlanButtonLabel.textContent = "创建计划";
  elements.createPlanButton.disabled = false;
  elements.savePlanButton.textContent = "保存计划";
  elements.planFormHeading.textContent = "创建计划";
  document.body.classList.remove("plan-form-open");
  clearPlanFormError();
  updatePlanFormCounters();
  elements.emptyMessage.hidden = state.plans.length > 0;
}

function handlePlanSubmit(event) {
  event.preventDefault();

  const title = elements.planTitleInput.value.trim();
  const priority = elements.planPriorityInput.value;
  const tag = elements.planTagInput.value.trim().slice(0, 16);
  const dueAt = elements.planDueAtInput.value;
  const repeat = RecurrenceTools.normalizeRepeat(
    elements.planRepeatInput.value
  );
  const reminderMinutes = ReminderTools.normalizeReminderMinutes(
    elements.planReminderMinutesInput.value
  );
  const notes = TextTools.normalizePlanNotes(
    elements.planNotesInput.value
  );

  const validation = PlanFormTools.validatePlanDraft({
    title,
    dueAt,
    repeat
  });

  if (!validation.valid) {
    showPlanFormError(validation);
    return;
  }

  clearPlanFormError();

  if (state.editingPlanId === null) {
    state.plans.push({
      id: Date.now(),
      title,
      tag,
      priority,
      dueAt,
      repeat,
      reminderMinutes,
      notes,
      subtasks: [],
      reminded: false,
      snoozedUntil: null,
      postponedFrom: "",
      postponeReason: "",
      postponedAt: null,
      completed: false,
      nextOccurrenceCreated: false,
      generatedFromId: null
    });
  } else {
    const editingPlan = state.plans.find(function (plan) {
      return plan.id === state.editingPlanId;
    });

    if (editingPlan !== undefined) {
      editingPlan.title = title;
      editingPlan.tag = tag;
      editingPlan.priority = priority;
      editingPlan.repeat = repeat;

      if (
        editingPlan.dueAt !== dueAt ||
        editingPlan.reminderMinutes !== reminderMinutes
      ) {
        editingPlan.reminded = false;
        editingPlan.snoozedUntil = null;
      }

      if (editingPlan.dueAt !== dueAt) {
        editingPlan.postponedFrom = "";
        editingPlan.postponeReason = "";
        editingPlan.postponedAt = null;
      }

      editingPlan.dueAt = dueAt;
      editingPlan.reminderMinutes = reminderMinutes;
      editingPlan.notes = notes;
    }
  }

  savePlans();
  renderPlans();
  closePlanForm();
}

/* ===== Plan list ===== */

function updatePlanSummary() {
  const completedCount = state.plans.filter(function (plan) {
    return plan.completed;
  }).length;
  const pendingCount = state.plans.length - completedCount;

  elements.planSummary.textContent =
    pendingCount + " 项待完成 · " + completedCount + " 项已完成";
}

function getVisiblePlans() {
  return PlanTools.sortPlansForDisplay(state.plans);
}

function updateBatchControls(visiblePlans) {
  const selectedCount = state.selectedPlanIds.size;
  const visibleSelectedCount = visiblePlans.filter(function (plan) {
    return state.selectedPlanIds.has(plan.id);
  }).length;
  const allVisibleSelected =
    visiblePlans.length > 0 && visibleSelectedCount === visiblePlans.length;

  elements.batchActionBar.hidden = !state.batchMode;
  elements.batchModeButton.textContent = state.batchMode
    ? "管理中"
    : "批量管理";
  elements.batchModeButton.disabled = state.batchMode;
  elements.batchSelectionSummary.textContent =
    "已选择 " + selectedCount + " 项";
  elements.batchSelectAll.checked = allVisibleSelected;
  elements.batchSelectAll.indeterminate =
    visibleSelectedCount > 0 && !allVisibleSelected;
  elements.batchSelectAll.disabled = visiblePlans.length === 0;
  elements.batchCompleteButton.disabled = selectedCount === 0;
  elements.batchDeleteButton.disabled = selectedCount === 0;
}

function setBatchMode(enabled) {
  state.batchMode = enabled;
  state.selectedPlanIds.clear();
  renderPlans();
}

function hideActionFeedback() {
  if (state.actionFeedback.timeoutId !== null) {
    clearTimeout(state.actionFeedback.timeoutId);
  }

  state.actionFeedback.deletionSnapshot = null;
  state.actionFeedback.timeoutId = null;
  elements.actionToast.hidden = true;
}

function showActionFeedback(message, deletionSnapshot) {
  if (state.actionFeedback.timeoutId !== null) {
    clearTimeout(state.actionFeedback.timeoutId);
  }

  state.actionFeedback.deletionSnapshot = deletionSnapshot || null;
  elements.actionToastMessage.textContent = message;
  elements.undoActionButton.hidden = !deletionSnapshot;
  elements.actionToast.hidden = false;

  state.actionFeedback.timeoutId = setTimeout(function () {
    hideActionFeedback();
  }, 6000);
}

function undoLastPlanDeletion() {
  const snapshot = state.actionFeedback.deletionSnapshot;

  if (snapshot === null) {
    return;
  }

  state.plans = UndoTools.restoreDeletedPlans(state.plans, snapshot);
  state.selectedPlanIds.clear();
  savePlans();
  renderPlans();
  showActionFeedback("已撤销删除。", null);
}

function updateTimerPlanOptions() {
  const previousSelectedPlanId = state.timer.selectedPlanId;
  const selectedPlanStillExists = state.plans.some(function (plan) {
    return String(plan.id) === state.timer.selectedPlanId;
  });

  if (!selectedPlanStillExists) {
    state.timer.selectedPlanId = "";
  }

  if (
    previousSelectedPlanId &&
    previousSelectedPlanId !== state.timer.selectedPlanId
  ) {
    persistTimerState();
  }

  elements.timerPlanSelect.innerHTML = "";

  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "不关联计划";
  elements.timerPlanSelect.appendChild(emptyOption);

  state.plans.forEach(function (plan) {
    const option = document.createElement("option");
    option.value = String(plan.id);
    option.textContent = plan.completed ? plan.title + "（已完成）" : plan.title;
    elements.timerPlanSelect.appendChild(option);
  });

  elements.timerPlanSelect.value = state.timer.selectedPlanId;
}

function createPlanActionButton(className, label, iconMarkup) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "plan-action-button " + className;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.innerHTML =
    '<svg class="plan-action-icon" viewBox="0 0 24 24" aria-hidden="true">' +
    iconMarkup +
    "</svg>";

  return button;
}

function createPlanItem(plan) {
  const planItem = document.createElement("li");
  const planContent = document.createElement("label");
  const checkbox = document.createElement("input");
  const planText = document.createElement("div");
  const planHeading = document.createElement("div");
  const planTitle = document.createElement("span");
  const planStatus = document.createElement("span");
  const planMeta = document.createElement("small");
  const planTag = document.createElement("small");
  const postponeNote = document.createElement("small");
  const planActions = document.createElement("div");
  const detailsButton = createPlanActionButton(
    "details-button",
    "查看详情：" + plan.title,
    '<path d="M2.1 12s3.6-6 9.9-6 9.9 6 9.9 6-3.6 6-9.9 6-9.9-6-9.9-6Z"></path>' +
      '<circle cx="12" cy="12" r="2.5"></circle>'
  );
  const editButton = createPlanActionButton(
    "edit-button",
    "编辑计划：" + plan.title,
    '<path d="M12 20h9"></path>' +
      '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"></path>'
  );
  const postponeButton = createPlanActionButton(
    "postpone-button",
    "延期计划：" + plan.title,
    '<path d="M8 2v3M16 2v3M3 9h18"></path>' +
      '<path d="M19 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h7"></path>' +
      '<circle cx="17" cy="17" r="4"></circle>' +
      '<path d="M17 15v2l1.3 1"></path>'
  );
  const deleteButton = createPlanActionButton(
    "delete-button",
    "删除计划：" + plan.title,
    '<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6"></path>' +
      '<path d="M10 11v5M14 11v5"></path>'
  );

  planItem.className = "plan-item priority-" + plan.priority;
  planContent.className = "plan-content";
  planText.className = "plan-text";
  planHeading.className = "plan-item-heading";
  planTitle.className = "plan-title";
  planStatus.className = "plan-state";
  planMeta.className = "plan-meta";
  planTag.className = "plan-tag";
  postponeNote.className = "plan-postpone-note";
  planActions.className = "plan-actions";

  checkbox.type = "checkbox";
  checkbox.className = "plan-completion-checkbox";
  checkbox.checked = plan.completed;
  checkbox.setAttribute(
    "aria-label",
    (plan.completed ? "取消完成：" : "标记完成：") + plan.title
  );
  planTitle.textContent = plan.title;
  planStatus.textContent = plan.completed ? "已完成" : "待完成";
  planStatus.classList.add(plan.completed ? "is-completed" : "is-pending");
  planMeta.textContent =
    formatDateTime(plan.dueAt) + " · " + PRIORITY_LABELS[plan.priority] + "优先级";
  if (REPEAT_LABELS[plan.repeat]) {
    planMeta.textContent += " · " + REPEAT_LABELS[plan.repeat];
  }
  if (REMINDER_LABELS[plan.reminderMinutes]) {
    planMeta.textContent += " · " +
      REMINDER_LABELS[plan.reminderMinutes];
  }
  if (!plan.reminded && plan.snoozedUntil !== null) {
    planMeta.textContent += " · 稍后提醒至 " +
      formatDateTime(plan.snoozedUntil);
  }
  const subtaskProgress = SubtaskTools.calculateSubtaskProgress(
    plan.subtasks
  );
  if (subtaskProgress.total > 0) {
    planMeta.textContent += " · 子任务 " +
      subtaskProgress.completed + "/" + subtaskProgress.total;
  }
  planTag.textContent = plan.tag;
  planTag.hidden = !plan.tag;
  postponeNote.textContent = plan.postponeReason
    ? "延期：" + plan.postponeReason
    : "";
  postponeNote.hidden = !plan.postponeReason;

  postponeButton.hidden = plan.completed;

  if (state.batchMode) {
    const selectionCheckbox = document.createElement("input");
    selectionCheckbox.type = "checkbox";
    selectionCheckbox.className = "plan-select-checkbox";
    selectionCheckbox.checked = state.selectedPlanIds.has(plan.id);
    selectionCheckbox.setAttribute(
      "aria-label",
      "选择计划：" + plan.title
    );
    selectionCheckbox.addEventListener("change", function () {
      if (selectionCheckbox.checked) {
        state.selectedPlanIds.add(plan.id);
      } else {
        state.selectedPlanIds.delete(plan.id);
      }

      renderPlans();
    });
    planItem.classList.add("is-selecting");
    planItem.appendChild(selectionCheckbox);
  }

  if (plan.completed) {
    planItem.classList.add("completed");
  } else if (isPlanOverdue(plan)) {
    planItem.classList.add("overdue");
    planMeta.textContent += " · 已逾期";
  }

  checkbox.addEventListener("change", function () {
    const nextPlanCreated = checkbox.checked
      ? completePlanOccurrence(plan)
      : false;

    if (!checkbox.checked) {
      plan.completed = false;
    }

    savePlans();
    renderPlans();

    if (nextPlanCreated) {
      showActionFeedback(
        "本次计划已完成，下一周期计划已生成。",
        null
      );
    }
  });

  editButton.addEventListener("click", function () {
    openEditPlanForm(plan);
  });

  detailsButton.addEventListener("click", function () {
    openPlanDetails(plan);
  });

  postponeButton.addEventListener("click", function () {
    openPostponePlanDialog(plan);
  });

  deleteButton.addEventListener("click", function () {
    const deletionSnapshot = UndoTools.createDeletionSnapshot(
      state.plans,
      new Set([plan.id])
    );

    state.plans = state.plans.filter(function (item) {
      return item.id !== plan.id;
    });
    state.selectedPlanIds.delete(plan.id);

    if (state.editingPlanId === plan.id) {
      closePlanForm();
    }
    if (state.viewingPlanId === plan.id) {
      closePlanDetails();
    }
    if (state.postponingPlanId === plan.id) {
      closePostponePlanDialog();
    }

    savePlans();
    renderPlans();
    showActionFeedback("已删除计划“" + plan.title + "”。", deletionSnapshot);
  });

  planHeading.appendChild(planTitle);
  planHeading.appendChild(planStatus);
  planText.appendChild(planHeading);
  planText.appendChild(planMeta);
  planText.appendChild(planTag);
  planText.appendChild(postponeNote);
  planContent.appendChild(checkbox);
  planContent.appendChild(planText);
  planItem.appendChild(planContent);
  planActions.appendChild(detailsButton);
  planActions.appendChild(editButton);
  planActions.appendChild(postponeButton);
  planActions.appendChild(deleteButton);
  planItem.appendChild(planActions);

  return planItem;
}

function openPlanDetails(plan) {
  state.viewingPlanId = plan.id;
  renderPlanDetails(plan);
  elements.planDetailsDialog.showModal();
}

function renderPlanDetails(plan) {
  elements.planDetailsTitle.textContent = plan.title;
  elements.planDetailsMeta.textContent =
    "优先级：" + PRIORITY_LABELS[plan.priority] +
    " · " + formatDateTime(plan.dueAt) +
    (REPEAT_LABELS[plan.repeat] ? " · " + REPEAT_LABELS[plan.repeat] : "") +
    (plan.postponeReason ? " · 延期：" + plan.postponeReason : "");
  elements.planDetailsNotes.textContent =
    plan.notes || "暂无备注。";
  renderSubtasks(plan);
}

function renderSubtasks(plan) {
  const progress = SubtaskTools.calculateSubtaskProgress(
    plan.subtasks
  );

  elements.subtaskProgress.textContent =
    progress.completed + " / " + progress.total;
  elements.subtaskList.innerHTML = "";
  elements.subtaskEmptyMessage.hidden = progress.total > 0;
  elements.subtaskInput.disabled =
    progress.total >= SubtaskTools.MAX_SUBTASKS;
  elements.addSubtaskButton.disabled =
    progress.total >= SubtaskTools.MAX_SUBTASKS;

  plan.subtasks.forEach(function (subtask) {
    const item = document.createElement("li");
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    const text = document.createElement("span");
    const deleteButton = document.createElement("button");

    item.className = "subtask-item";
    label.className = "subtask-content";
    checkbox.type = "checkbox";
    checkbox.checked = subtask.completed;
    text.textContent = subtask.text;
    deleteButton.type = "button";
    deleteButton.className = "subtask-delete-button";
    deleteButton.textContent = "删除";

    if (subtask.completed) {
      item.classList.add("is-completed");
    }

    checkbox.addEventListener("change", function () {
      plan.subtasks = SubtaskTools.toggleSubtask(
        plan.subtasks,
        subtask.id,
        checkbox.checked
      );
      savePlans();
      renderPlanDetails(plan);
      renderPlans();
    });

    deleteButton.addEventListener("click", function () {
      plan.subtasks = SubtaskTools.removeSubtask(
        plan.subtasks,
        subtask.id
      );
      savePlans();
      renderPlanDetails(plan);
      renderPlans();
    });

    label.appendChild(checkbox);
    label.appendChild(text);
    item.appendChild(label);
    item.appendChild(deleteButton);
    elements.subtaskList.appendChild(item);
  });
}

function createUniqueSubtaskId(plan) {
  let id = Date.now();

  while (plan.subtasks.some(function (subtask) {
    return subtask.id === id;
  })) {
    id += 1;
  }

  return id;
}

function addSubtask(event) {
  event.preventDefault();

  const plan = state.plans.find(function (item) {
    return item.id === state.viewingPlanId;
  });

  if (!plan || plan.subtasks.length >= SubtaskTools.MAX_SUBTASKS) {
    return;
  }

  const subtask = SubtaskTools.createSubtask(
    createUniqueSubtaskId(plan),
    elements.subtaskInput.value
  );

  if (subtask === null) {
    elements.subtaskInput.focus();
    return;
  }

  plan.subtasks = plan.subtasks.concat(subtask);
  elements.subtaskForm.reset();
  savePlans();
  renderPlanDetails(plan);
  renderPlans();
  elements.subtaskInput.focus();
}

function closePlanDetails() {
  state.viewingPlanId = null;

  if (elements.planDetailsDialog.open) {
    elements.planDetailsDialog.close();
  }
}

function editPlanFromDetails() {
  const plan = state.plans.find(function (item) {
    return item.id === state.viewingPlanId;
  });

  if (!plan) {
    closePlanDetails();
    return;
  }

  closePlanDetails();
  openEditPlanForm(plan);
}

function updatePostponeReasonCount() {
  const count = Array.from(elements.postponePlanReasonInput.value).length;

  elements.postponePlanReasonCount.textContent =
    count + " / " + PlanTools.POSTPONE_REASON_MAX_LENGTH;
}

function clearPostponePlanError() {
  elements.postponePlanError.hidden = true;
  elements.postponePlanError.textContent = "";
  elements.postponePlanDueAtInput.removeAttribute("aria-invalid");
  elements.postponePlanReasonInput.removeAttribute("aria-invalid");
}

function getDefaultPostponeDueAt(plan) {
  const now = new Date();
  const currentDueAt = new Date(plan.dueAt);
  const baseDate = !Number.isNaN(currentDueAt.getTime()) && currentDueAt > now
    ? currentDueAt
    : now;

  baseDate.setDate(baseDate.getDate() + 1);
  return RecurrenceTools.formatLocalDateTime(baseDate);
}

function openPostponePlanDialog(plan) {
  if (plan.completed) {
    return;
  }

  state.postponingPlanId = plan.id;
  elements.postponePlanForm.reset();
  elements.postponePlanTitle.textContent = plan.title;
  elements.postponePlanDueAtInput.value = getDefaultPostponeDueAt(plan);
  elements.postponePlanReasonInput.value = "";
  updatePostponeReasonCount();
  clearPostponePlanError();
  elements.postponePlanDialog.showModal();
  elements.postponePlanReasonInput.focus();
}

function closePostponePlanDialog() {
  state.postponingPlanId = null;
  elements.postponePlanForm.reset();
  updatePostponeReasonCount();
  clearPostponePlanError();

  if (elements.postponePlanDialog.open) {
    elements.postponePlanDialog.close();
  }
}

function handlePostponePlanSubmit(event) {
  event.preventDefault();
  const plan = state.plans.find(function (item) {
    return item.id === state.postponingPlanId;
  });

  if (!plan) {
    closePostponePlanDialog();
    return;
  }

  const validation = PlanTools.validatePostponement(plan, {
    newDueAt: elements.postponePlanDueAtInput.value,
    reason: elements.postponePlanReasonInput.value
  }, Date.now());

  if (!validation.valid) {
    const field = validation.field === "reason"
      ? elements.postponePlanReasonInput
      : elements.postponePlanDueAtInput;

    elements.postponePlanError.textContent = validation.message;
    elements.postponePlanError.hidden = false;
    field.setAttribute("aria-invalid", "true");
    field.focus();
    return;
  }

  plan.postponedFrom = plan.dueAt;
  plan.dueAt = validation.value.newDueAt;
  plan.postponeReason = validation.value.reason;
  plan.postponedAt = new Date().toISOString();
  plan.reminded = false;
  plan.snoozedUntil = null;
  savePlans();
  renderPlans();
  closePostponePlanDialog();
  showActionFeedback("计划已延期：" + validation.value.reason, null);
}

function renderPlans() {
  const visiblePlans = getVisiblePlans();

  elements.planList.innerHTML = "";
  elements.emptyMessage.hidden = visiblePlans.length > 0;
  elements.emptyMessage.textContent = "还没有计划，创建一个试试吧。";

  visiblePlans.forEach(function (plan) {
    elements.planList.appendChild(createPlanItem(plan));
  });

  updatePlanSummary();
  updateBatchControls(visiblePlans);
  updateTimerPlanOptions();
}

function completeSelectedPlans() {
  const selectedCount = state.selectedPlanIds.size;
  const selectedPlans = state.plans.filter(function (plan) {
    return state.selectedPlanIds.has(plan.id);
  });
  let generatedCount = 0;

  selectedPlans.forEach(function (plan) {
    if (completePlanOccurrence(plan)) {
      generatedCount += 1;
    }
  });
  state.selectedPlanIds.clear();
  savePlans();
  renderPlans();
  showActionFeedback(
    "已将 " + selectedCount + " 项计划标记为完成。" +
      (generatedCount > 0
        ? " 已生成 " + generatedCount + " 项下一周期计划。"
        : ""),
    null
  );
}

function createUniquePlanId() {
  let id = Date.now();

  while (state.plans.some(function (plan) {
    return plan.id === id;
  })) {
    id += 1;
  }

  return id;
}

function completePlanOccurrence(plan) {
  if (plan.completed) {
    return false;
  }

  plan.completed = true;

  if (plan.repeat === "none" || plan.nextOccurrenceCreated) {
    return false;
  }

  const nextPlan = RecurrenceTools.createNextOccurrence(
    plan,
    createUniquePlanId()
  );

  if (nextPlan === null) {
    return false;
  }

  plan.nextOccurrenceCreated = true;
  state.plans.push(nextPlan);
  return true;
}

function deleteSelectedPlans() {
  const selectedCount = state.selectedPlanIds.size;

  if (selectedCount === 0) {
    return;
  }

  const deletionSnapshot = UndoTools.createDeletionSnapshot(
    state.plans,
    state.selectedPlanIds
  );

  if (state.selectedPlanIds.has(state.editingPlanId)) {
    closePlanForm();
  }
  if (state.selectedPlanIds.has(state.viewingPlanId)) {
    closePlanDetails();
  }
  if (state.selectedPlanIds.has(state.postponingPlanId)) {
    closePostponePlanDialog();
  }

  state.plans = PlanTools.removeSelectedPlans(
    state.plans,
    state.selectedPlanIds
  );
  state.selectedPlanIds.clear();
  savePlans();
  renderPlans();
  showActionFeedback(
    "已删除 " + selectedCount + " 项计划。",
    deletionSnapshot
  );
}

function bindPlanEvents() {
  elements.createPlanButton.addEventListener("click", function () {
    navigateToPage("plans");
    openCreatePlanForm();
  });
  elements.cancelPlanButton.addEventListener("click", closePlanForm);
  elements.closePlanFormButton.addEventListener("click", closePlanForm);
  elements.planFormBackdrop.addEventListener("click", closePlanForm);
  elements.planForm.addEventListener("submit", handlePlanSubmit);
  elements.planTitleInput.addEventListener("input", function () {
    updatePlanCharacterCount(
      elements.planTitleInput,
      elements.planTitleCount,
      PlanFormTools.TITLE_MAX_LENGTH
    );
    clearPlanFormError();
  });
  elements.planNotesInput.addEventListener("input", function () {
    updatePlanCharacterCount(
      elements.planNotesInput,
      elements.planNotesCount,
      PlanFormTools.NOTES_MAX_LENGTH
    );
  });
  elements.planDueAtInput.addEventListener("change", function () {
    updatePlanTimeControls();
    clearPlanFormError();
  });
  elements.planRepeatInput.addEventListener("change", clearPlanFormError);
  elements.planQuickTimeButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      elements.planDueAtInput.value = PlanFormTools.getQuickPlanDate(
        button.dataset.planTimePreset
      );
      updatePlanTimeControls();
      clearPlanFormError();
    });
  });
  elements.closePlanDetailsButton.addEventListener("click", closePlanDetails);
  elements.editPlanFromDetailsButton.addEventListener(
    "click",
    editPlanFromDetails
  );
  elements.postponePlanForm.addEventListener(
    "submit",
    handlePostponePlanSubmit
  );
  elements.closePostponePlanButton.addEventListener(
    "click",
    closePostponePlanDialog
  );
  elements.cancelPostponePlanButton.addEventListener(
    "click",
    closePostponePlanDialog
  );
  elements.postponePlanReasonInput.addEventListener("input", function () {
    updatePostponeReasonCount();
    clearPostponePlanError();
  });
  elements.postponePlanDueAtInput.addEventListener(
    "change",
    clearPostponePlanError
  );
  elements.postponePlanDialog.addEventListener("close", function () {
    state.postponingPlanId = null;
  });
  elements.subtaskForm.addEventListener("submit", addSubtask);
  elements.planDetailsDialog.addEventListener("close", function () {
    state.viewingPlanId = null;
  });
  elements.batchModeButton.addEventListener("click", function () {
    setBatchMode(true);
  });
  elements.batchCancelButton.addEventListener("click", function () {
    setBatchMode(false);
  });
  elements.batchSelectAll.addEventListener("change", function () {
    getVisiblePlans().forEach(function (plan) {
      if (elements.batchSelectAll.checked) {
        state.selectedPlanIds.add(plan.id);
      } else {
        state.selectedPlanIds.delete(plan.id);
      }
    });
    renderPlans();
  });
  elements.batchCompleteButton.addEventListener(
    "click",
    completeSelectedPlans
  );
  elements.batchDeleteButton.addEventListener("click", deleteSelectedPlans);
  elements.undoActionButton.addEventListener("click", undoLastPlanDeletion);
}
export {
  bindPlanEvents,
  addSubtask,
  clearPlanFormError,
  clearPostponePlanError,
  closePlanDetails,
  closePlanForm,
  closePostponePlanDialog,
  completeSelectedPlans,
  deleteSelectedPlans,
  editPlanFromDetails,
  getVisiblePlans,
  handlePlanSubmit,
  handlePostponePlanSubmit,
  hideActionFeedback,
  openCreatePlanForm,
  openPlanDetails,
  renderPlans,
  setBatchMode,
  showActionFeedback,
  undoLastPlanDeletion,
  updatePlanCharacterCount,
  updatePlanTimeControls,
  updatePostponeReasonCount
};
