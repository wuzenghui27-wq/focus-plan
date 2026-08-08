import * as ShortcutTools from "../../domain/shortcuts.js";
import { elements, state } from "./context.js";
import { navigateToPage } from "../features/navigation.js";
import { closePlanDetails, closePlanForm, closePostponePlanDialog, hideActionFeedback, openCreatePlanForm, setBatchMode } from "../features/plans.js";

function handleApplicationShortcut(event) {
  const action = ShortcutTools.getShortcutAction(event);

  if (action === null) {
    return;
  }

  if (action === "create-plan") {
    event.preventDefault();
    navigateToPage("plans");
    openCreatePlanForm();
    return;
  }

  if (action === "escape") {
    if (elements.postponePlanDialog.open) {
      closePostponePlanDialog();
    } else if (elements.planDetailsDialog.open) {
      closePlanDetails();
    } else if (!elements.planForm.hidden) {
      closePlanForm();
    } else if (state.batchMode) {
      setBatchMode(false);
    } else if (!elements.actionToast.hidden) {
      hideActionFeedback();
    } else {
      return;
    }

    event.preventDefault();
  }
}
export {
  handleApplicationShortcut
};
