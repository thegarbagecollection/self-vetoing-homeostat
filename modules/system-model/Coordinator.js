class Coordinator {
  /**
   * 
   * @param {Specification} specification
   */
  constructor(specification) {
    specification.construct()
    this.systems = specification.getSystems()
    this.couplings = specification.getCouplings()
  }
  timeStep() {
    this.systems.forEach(system => system.prepareTransition())
    this.systems.forEach(system => system.transition())
  }

  restoreDefaultStartState() {
    this.systems.forEach(system => system.toDefaultStartState())
  }
}


