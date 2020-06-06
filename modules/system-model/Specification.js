class Specification {
  constructor() {
  }
  construct() {
  }
  checkConflicts() {
  }
  /**
   * @returns {Array.<ISystem>}
   */
  getSystems() {
  }
  /**
   * @returns {Array.<Coupling>}
   */
  getCouplings() {
  }
}
class SystemSpecification {
  constructor(identifier, displayName, stateIdentifiers, transitionID, transitionSpecifications, nullTransition, homeostasisGroupings, deathStates) {
    this.identifier = identifier;
    this.displayName = displayName ? displayName : identifier;
    this.stateIdentifiers = stateIdentifiers;
    this.transitionSpecification = transitionSpecifications.get(transitionID);
    this.nullTransition = nullTransition;
    this.homeostasisGroupings = homeostasisGroupings;
    this.deathStates = deathStates;
  }
  check() {
  }
  checkHomeostasisGroupings() {
  }
  checkDeathStates() {
  }
  construct() {
  }
}
class CouplingSpecification {
}
class TransitionSpecification {
  constructor(identifier, systemStates, transitions) {
    this.identifier = identifier;
    this.systemStates = systemStates;
    this.transitions = transitions;
  }
  check() {
  }
}
class CheckResult {
  constructor() {
    this.failed = false;
    this.msgLog = [];
  }
  fail(msg) {
    this.failed = true;
    this.msgLog.push(msg);
  }
  wasSuccess() {
    return !this.failed;
  }
}
