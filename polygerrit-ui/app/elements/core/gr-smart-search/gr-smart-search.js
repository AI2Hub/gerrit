/**
 * @license
 * Copyright (C) 2016 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import '../../../scripts/bundled-polymer.js';

import '../../../behaviors/gr-display-name-behavior/gr-display-name-behavior.js';
import '../gr-navigation/gr-navigation.js';
import '../../shared/gr-rest-api-interface/gr-rest-api-interface.js';
import '../gr-search-bar/gr-search-bar.js';
import {mixinBehaviors} from '@polymer/polymer/lib/legacy/class.js';
import {GestureEventListeners} from '@polymer/polymer/lib/mixins/gesture-event-listeners.js';
import {LegacyElementMixin} from '@polymer/polymer/lib/legacy/legacy-element-mixin.js';
import {PolymerElement} from '@polymer/polymer/polymer-element.js';
import {htmlTemplate} from './gr-smart-search_html.js';

const MAX_AUTOCOMPLETE_RESULTS = 10;
const SELF_EXPRESSION = 'self';
const ME_EXPRESSION = 'me';

/**
 * @appliesMixin Gerrit.DisplayNameMixin
 * @extends Polymer.Element
 */
class GrSmartSearch extends mixinBehaviors( [
  Gerrit.DisplayNameBehavior,
], GestureEventListeners(
    LegacyElementMixin(
        PolymerElement))) {
  static get template() { return htmlTemplate; }

  static get is() { return 'gr-smart-search'; }

  static get properties() {
    return {
      searchQuery: String,
      _config: Object,
      _projectSuggestions: {
        type: Function,
        value() {
          return this._fetchProjects.bind(this);
        },
      },
      _groupSuggestions: {
        type: Function,
        value() {
          return this._fetchGroups.bind(this);
        },
      },
      _accountSuggestions: {
        type: Function,
        value() {
          return this._fetchAccounts.bind(this);
        },
      },
    };
  }

  /** @override */
  attached() {
    super.attached();
    this.$.restAPI.getConfig().then(cfg => {
      this._config = cfg;
    });
  }

  _handleSearch(e) {
    const input = e.detail.inputVal;
    if (input) {
      Gerrit.Nav.navigateToSearchQuery(input);
    }
  }

  /**
   * Fetch from the API the predicted projects.
   *
   * @param {string} predicate - The first part of the search term, e.g.
   *     'project'
   * @param {string} expression - The second part of the search term, e.g.
   *     'gerr'
   * @return {!Promise} This returns a promise that resolves to an array of
   *     strings.
   */
  _fetchProjects(predicate, expression) {
    return this.$.restAPI.getSuggestedProjects(
        expression,
        MAX_AUTOCOMPLETE_RESULTS)
        .then(projects => {
          if (!projects) { return []; }
          const keys = Object.keys(projects);
          return keys.map(key => { return {text: predicate + ':' + key}; });
        });
  }

  /**
   * Fetch from the API the predicted groups.
   *
   * @param {string} predicate - The first part of the search term, e.g.
   *     'ownerin'
   * @param {string} expression - The second part of the search term, e.g.
   *     'polyger'
   * @return {!Promise} This returns a promise that resolves to an array of
   *     strings.
   */
  _fetchGroups(predicate, expression) {
    if (expression.length === 0) { return Promise.resolve([]); }
    return this.$.restAPI.getSuggestedGroups(
        expression,
        MAX_AUTOCOMPLETE_RESULTS)
        .then(groups => {
          if (!groups) { return []; }
          const keys = Object.keys(groups);
          return keys.map(key => { return {text: predicate + ':' + key}; });
        });
  }

  /**
   * Fetch from the API the predicted accounts.
   *
   * @param {string} predicate - The first part of the search term, e.g.
   *     'owner'
   * @param {string} expression - The second part of the search term, e.g.
   *     'kasp'
   * @return {!Promise} This returns a promise that resolves to an array of
   *     strings.
   */
  _fetchAccounts(predicate, expression) {
    if (expression.length === 0) { return Promise.resolve([]); }
    return this.$.restAPI.getSuggestedAccounts(
        expression,
        MAX_AUTOCOMPLETE_RESULTS)
        .then(accounts => {
          if (!accounts) { return []; }
          return this._mapAccountsHelper(accounts, predicate);
        })
        .then(accounts => {
          // When the expression supplied is a beginning substring of 'self',
          // add it as an autocomplete option.
          if (SELF_EXPRESSION.startsWith(expression)) {
            return accounts.concat(
                [{text: predicate + ':' + SELF_EXPRESSION}]);
          } else if (ME_EXPRESSION.startsWith(expression)) {
            return accounts.concat([{text: predicate + ':' + ME_EXPRESSION}]);
          } else {
            return accounts;
          }
        });
  }

  _mapAccountsHelper(accounts, predicate) {
    return accounts.map(account => {
      const userName = this.getUserName(this._serverConfig, account);
      return {
        label: account.name || '',
        text: account.email ?
          `${predicate}:${account.email}` :
          `${predicate}:"${userName}"`,
      };
    });
  }
}

customElements.define(GrSmartSearch.is, GrSmartSearch);
