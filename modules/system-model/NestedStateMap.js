/**
 * @template PrimaryK, SecondaryK, Value
 * @description PrimaryK is the nested map's first key type, SecondaryK the key type for all nested inner maps, V for the value.
 *
 * A lookup is done with the pair ( p: PrimaryK, s: SecondaryK[] ), which first uses the primary key to obtain the nested
 * inner maps, then consecutively applies the given secondary keys to extract the nested maps until the final inner map is reached,
 * in which case final key is used to extract the value. Note that s must be in the correct order!
 *
 * An exception is raised if 1 + s.length !== the number of maps contained
 *
 * May also be used as a regular map if s.length === 0
 */
class NestedStateMap {
  /**
   *
   * @param {Number} secondaryCount
   * @param {(p: PrimaryK) => any} pkExtractor extracts the key from the primary object
   * @param {(s: SecondaryK) => any} skExtractor extracts the key from the primary object
   */
  constructor(secondaryCount, pkExtractor, skExtractor) {
    this.map = new Map()
    this.secondaryCount = secondaryCount
    this.pkExtractor = pkExtractor
    this.skExtractor = skExtractor
  }
  /**
   *
   * @param {PrimaryK} primary
   * @param {Array.<SecondaryK>} secondaries
   * @returns {Value}
   */
  get(primary, secondaries) {
    let pk = this.pkExtractor(primary)
    if (!this.map.has(pk)) `key not found: ${pk} of (${pk}, ${sks.toString()})`
    let sks = secondaries.map(this.skExtractor)
    if (secondaries && secondaries.length !== this.secondaryCount) throw `get() given secondaries of length ${secondaries.length}; required ${this.secondaryCount}`
    if (!secondaries || secondaries.length === 0) {
      return this.map.get(pk)
    } else {
      /** @type {Map | Value} */
      let outer = this.map.get(pk)
      sks.forEach(sk => {
        if (!outer.has(sk)) throw `key not found: ${sk} of (${pk}, ${sks.toString()})`
        outer = outer.get(sk) // in last iteration, this gets assigned a Value
      })
      return outer
    }
  }
  /**
   *
   * @param {PrimaryK} primary
   * @param {Array.<SecondaryK>} secondaries
   * @param {Value} value
   */
  set(primary, secondaries, value) {
    let pk = this.pkExtractor(primary)
    let sks = secondaries.map(this.skExtractor)
    if (secondaries && secondaries.length !== this.secondaryCount) throw `set() given secondaries of length ${secondaries.length}; required ${this.secondaryCount}`
    if (!secondaries || secondaries.length === 0) {
      this.map.set(pk, value)
    } else {
      if (!this.map.has(pk)) this.map.set(pk, new Map())
      /** @type {Map} */
      let outer = this.map.get(pk)
      sks.forEach((sk, i) => {
        // need to distinguish the case where this is the last sk (maps to value) rather than not (maps to Map)
        if (i === sks.length - 1) {
          // last element, so needs to set a value
          outer.set(sk, value)
        }
        if (!outer.has(sk) && i < sks.length - 1) {
          outer.set(sk, new Map())
        }
        /** @type {Map} */
        outer = outer.get(sk) // in the last iteration, this gets assigned a non-map, but doesn't matter because we're done
      })
    }
  }

  /**
   * @returns {Array.<{p: PrimaryK, s: Array.<SecondaryK>, v: Value}>} all the key-value pairs in this map,
   * as an object with explicit primary key and secondary keys. Secondary keys may be the empty list
   * if secondary keys aren't used in this map instance.
   */
  toArray() {
    let ret = []
    for (let [p,v] of this.map.entries()) {
      if (this.secondaryCount === 0) {
        ret.push({ p, s: [], v })
      } else {
        this.toArrayRecursive(p, [], 1, v, ret)
      }
    }
  }

  toArrayRecursive(currPri, currSecArray, currDepth, currSecMap, ret) {
    if (currDepth === this.secondaryCount) {
      for (let [sk, v] of currSecMap.entries()) {
        ret.push({ p: currPri, s: currSecArray + sk, v: v})
      }
    }
    else {
      for (let [sk, v] of currSecMap.entries()) {
        let newSecArray = Array.from(currSecArray)
        newSecArray.push(sk)
        this.toArrayRecursive(p, newSecArray, currDepth + 1, v, ret)
      }
    }
  }
}
