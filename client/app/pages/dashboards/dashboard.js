import * as _ from 'lodash';
import PromiseRejectionError from '@/lib/promise-rejection-error';
import getTags from '@/services/getTags';
import { policy } from '@/services/policy';
import { Widget } from '@/services/widget';
import {
  editableMappingsToParameterMappings,
  synchronizeWidgetTitles,
} from '@/components/ParameterMappingInput';
import { collectDashboardFilters } from '@/services/dashboard';
import { durationHumanize } from '@/filters';
import template from './dashboard.html';
import ShareDashboardDialog from './ShareDashboardDialog';
import AddWidgetDialog from '@/components/dashboards/AddWidgetDialog';
import TextboxDialog from '@/components/dashboards/TextboxDialog';
import notification from '@/services/notification';

import './dashboard.less';

function getChangedPositions(widgets, nextPositions = {}) {
  return _.pickBy(nextPositions, (nextPos, widgetId) => {
    const widget = _.find(widgets, { id: Number(widgetId) });
    const prevPos = widget.options.position;
    return !_.isMatch(prevPos, nextPos);
  });
}

function DashboardCtrl(
  $routeParams,
  $location,
  $timeout,
  $q,
  $uibModal,
  $scope,
  Title,
  AlertDialog,
  Dashboard,
  currentUser,
  clientConfig,
  Events,
) {
  let recentPositions = [];

  const saveDashboardLayout = (changedPositions) => {
    if (!this.dashboard.canEdit()) {
      return;
    }

    this.saveInProgress = true;

    const saveChangedWidgets = _.map(changedPositions, (position, id) => {
      // find widget
      const widget = _.find(this.dashboard.widgets, { id: Number(id) });

      // skip already deleted widget
      if (!widget) {
        return Promise.resolve();
      }

      return widget.save('options', { position });
    });

    return $q
      .all(saveChangedWidgets)
      .then(() => {
        this.isLayoutDirty = false;
        if (this.editBtnClickedWhileSaving) {
          this.layoutEditing = false;
        }
      })
      .catch(() => {
        notification.error('Error saving changes.');
      })
      .finally(() => {
        this.saveInProgress = false;
        this.editBtnClickedWhileSaving = false;
        $scope.$applyAsync();
      });
  };

  const saveDashboardLayoutDebounced = (...args) => {
    this.saveDelay = true;
    return _.debounce(() => {
      this.saveDelay = false;
      saveDashboardLayout(...args);
    }, 2000)();
  };

  this.retrySaveDashboardLayout = () => {
    this.onLayoutChange(recentPositions);
  };

  // grid vars
  this.saveDelay = false;
  this.saveInProgress = false;
  this.recentLayoutPositions = {};
  this.editBtnClickedWhileSaving = false;
  this.layoutEditing = false;
  this.isLayoutDirty = false;
  this.isGridDisabled = false;

  // dashboard vars
  this.isFullscreen = false;
  this.refreshRate = null;
  this.showPermissionsControl = clientConfig.showPermissionsControl;
  this.globalParameters = [];
  this.isDashboardOwner = false;
  this.filters = [];

  this.refreshRates = clientConfig.dashboardRefreshIntervals.map(interval => ({
    name: durationHumanize(interval),
    rate: interval,
    enabled: true,
  }));

  const allowedIntervals = policy.getDashboardRefreshIntervals();
  if (_.isArray(allowedIntervals)) {
    _.each(this.refreshRates, (rate) => {
      rate.enabled = allowedIntervals.indexOf(rate.rate) >= 0;
    });
  }

  this.addRefreshToPublicUrl = () => {
    if (this.dashboard.refreshRate) this.dashboard.public_url += '&refresh=' + this.dashboard.refreshRate.rate;
  };
  this.setRefreshRate = (rate, load = true) => {
    this.refreshRate = rate;
    if (rate !== null) {
      if (this.dashboard) {
        this.dashboard.refreshRate = rate; // 将rate加入到this.dashboard中
        this.addRefreshToPublicUrl();
      }
      if (load) {
        this.refreshDashboard();
      }
      this.autoRefresh();
    }
  };

  this.extractGlobalParameters = () => {
    this.globalParameters = this.dashboard.getParametersDefs();
  };

  $scope.$on('dashboard.update-parameters', () => {
    this.extractGlobalParameters();
  });

  const collectFilters = (dashboard, forceRefresh) => {
    const queryResultPromises = _.compact(this.dashboard.widgets.map((widget) => {
      widget.getParametersDefs(); // Force widget to read parameters values from URL
      return widget.load(forceRefresh);
    }));

    $q.all(queryResultPromises).then((queryResults) => {
      this.filters = collectDashboardFilters(dashboard, queryResults, $location.search());
      this.filtersOnChange = (allFilters) => {
        this.filters = allFilters;
        $scope.$applyAsync();
      };
    });
  };

  const renderDashboard = (dashboard, force) => {
    Title.set(dashboard.name);
    this.extractGlobalParameters();
    collectFilters(dashboard, force);
  };

  this.loadDashboard = _.throttle((force) => {
    Dashboard.get(
      { slug: $routeParams.dashboardSlug },
      (dashboard) => {
        this.dashboard = dashboard;
        this.isDashboardOwner = currentUser.id === dashboard.user.id || currentUser.hasPermission('admin');
        Events.record('view', 'dashboard', dashboard.id);
        renderDashboard(dashboard, force);

        if ($location.search().edit === true) {
          $location.search('edit', null);
          this.editLayout(true);
        }

        if ($location.search().refresh !== undefined) {
          if (this.refreshRate === null) {
            const refreshRate = Math.max(30, parseFloat($location.search().refresh));

            this.setRefreshRate(
              {
                name: durationHumanize(refreshRate),
                rate: refreshRate,
              },
              false,
            );
          }
        }
      },
      (rejection) => {
        const statusGroup = Math.floor(rejection.status / 100);
        if (statusGroup === 5) {
          // recoverable errors - all 5** (server is temporarily unavailable
          // for some reason, but it should get up soon).
          this.loadDashboard();
        } else {
          // all kind of 4** errors are not recoverable, so just display them
          throw new PromiseRejectionError(rejection);
        }
      },
    );
  }, 1000);

  this.loadDashboard();

  this.refreshDashboard = () => {
    renderDashboard(this.dashboard, true);
  };

  this.autoRefresh = () => {
    $timeout(() => {
      this.refreshDashboard();
    }, this.refreshRate.rate * 1000).then(() => this.autoRefresh());
  };

  this.archiveDashboard = () => {
    const archive = () => {
      Events.record('archive', 'dashboard', this.dashboard.id);
      this.dashboard.$delete();
    };

    const title = 'Archive Dashboard';
    const message = `Are you sure you want to archive the "${this.dashboard.name}" dashboard?`;
    const confirm = { class: 'btn-warning', title: 'Archive' };

    AlertDialog.open(title, message, confirm).then(archive);
  };

  this.showManagePermissionsModal = () => {
    $uibModal.open({
      component: 'permissionsEditor',
      resolve: {
        aclUrl: { url: `api/dashboards/${this.dashboard.id}/acl` },
        owner: this.dashboard.user,
      },
    });
  };

  this.onLayoutChange = (positions) => {
    recentPositions = positions; // required for retry if subsequent save fails

    // determine position changes
    const changedPositions = getChangedPositions(this.dashboard.widgets, positions);
    if (_.isEmpty(changedPositions)) {
      this.isLayoutDirty = false;
      $scope.$applyAsync();
      return;
    }

    this.isLayoutDirty = true;
    $scope.$applyAsync();

    // debounce in edit mode, immediate in preview
    if (this.layoutEditing) {
      saveDashboardLayoutDebounced(changedPositions);
    } else {
      saveDashboardLayout(changedPositions);
    }
  };

  this.onBreakpointChanged = (isSingleCol) => {
    this.isGridDisabled = isSingleCol;
    $scope.$applyAsync();
  };

  this.editLayout = (isEditing) => {
    this.layoutEditing = isEditing;
  };

  this.loadTags = () => getTags('api/dashboards/tags').then(tags => _.map(tags, t => t.name));

  const updateDashboard = (data) => {
    _.extend(this.dashboard, data);
    data = _.extend({}, data, {
      slug: this.dashboard.id,
      version: this.dashboard.version,
    });
    Dashboard.save(
      data,
      (dashboard) => {
        _.extend(this.dashboard, _.pick(dashboard, _.keys(data)));
      },
      (error) => {
        if (error.status === 403) {
          notification.error('Dashboard update failed', 'Permission Denied.');
        } else if (error.status === 409) {
          notification.error(
            'It seems like the dashboard has been modified by another user. ',
            'Please copy/backup your changes and reload this page.',
            { duration: null },
          );
        }
      },
    );
  };

  this.saveName = (name) => {
    updateDashboard({ name });
  };

  this.saveTags = (tags) => {
    updateDashboard({ tags });
  };

  this.updateDashboardFiltersState = () => {
    collectFilters(this.dashboard, false);
    Dashboard.save(
      {
        slug: this.dashboard.id,
        version: this.dashboard.version,
        dashboard_filters_enabled: this.dashboard.dashboard_filters_enabled,
      },
      (dashboard) => {
        this.dashboard = dashboard;
      },
      (error) => {
        if (error.status === 403) {
          notification.error('Name update failed', 'Permission denied.');
        } else if (error.status === 409) {
          notification.error(
            'It seems like the dashboard has been modified by another user. ',
            'Please copy/backup your changes and reload this page.',
            { duration: null },
          );
        }
      },
    );
  };

  this.showAddTextboxDialog = () => {
    TextboxDialog.showModal({
      dashboard: this.dashboard,
      onConfirm: this.addTextbox,
    });
  };

  this.addTextbox = (text) => {
    const widget = new Widget({
      dashboard_id: this.dashboard.id,
      options: {
        isHidden: false,
        position: {},
      },
      text,
      visualization: null,
      visualization_id: null,
    });

    const position = this.dashboard.calculateNewWidgetPosition(widget);
    widget.options.position.col = position.col;
    widget.options.position.row = position.row;

    return widget.save()
      .then(() => {
        this.dashboard.widgets.push(widget);
        this.dashboard.widgets = [...this.dashboard.widgets]; // ANGULAR_REMOVE_ME
        this.onWidgetAdded();
      });
  };

  this.showAddWidgetDialog = () => {
    AddWidgetDialog.showModal({
      dashboard: this.dashboard,
      onConfirm: this.addWidget,
    });
  };

  this.addWidget = (selectedVis, parameterMappings) => {
    const widget = new Widget({
      visualization_id: selectedVis && selectedVis.id,
      dashboard_id: this.dashboard.id,
      options: {
        isHidden: false,
        position: {},
        parameterMappings: editableMappingsToParameterMappings(parameterMappings),
      },
      visualization: selectedVis,
      text: '',
    });

    const position = this.dashboard.calculateNewWidgetPosition(widget);
    widget.options.position.col = position.col;
    widget.options.position.row = position.row;

    const widgetsToSave = [
      widget,
      ...synchronizeWidgetTitles(widget.options.parameterMappings, this.dashboard.widgets),
    ];

    return Promise.all(widgetsToSave.map(w => w.save()))
      .then(() => {
        this.dashboard.widgets.push(widget);
        this.dashboard.widgets = [...this.dashboard.widgets]; // ANGULAR_REMOVE_ME
        this.onWidgetAdded();
      });
  };

  this.onWidgetAdded = () => {
    this.extractGlobalParameters();
    collectFilters(this.dashboard, false);
    // Save position of newly added widget (but not entire layout)
    const widget = _.last(this.dashboard.widgets);
    if (_.isObject(widget)) {
      return widget.save();
    }
    $scope.$applyAsync();
  };

  this.removeWidget = (widgetId) => {
    this.dashboard.widgets = this.dashboard.widgets.filter(w => w.id !== undefined && w.id !== widgetId);
    this.extractGlobalParameters();
    collectFilters(this.dashboard, false);
    $scope.$applyAsync();
  };

  this.toggleFullscreen = () => {
    this.isFullscreen = !this.isFullscreen;
    document.querySelector('body').classList.toggle('headless');

    if (this.isFullscreen) {
      $location.search('fullscreen', true);
    } else {
      $location.search('fullscreen', null);
    }
  };

  this.togglePublished = () => {
    Events.record('toggle_published', 'dashboard', this.dashboard.id);
    this.dashboard.is_draft = !this.dashboard.is_draft;
    this.saveInProgress = true;
    Dashboard.save(
      {
        slug: this.dashboard.id,
        name: this.dashboard.name,
        is_draft: this.dashboard.is_draft,
      },
      (dashboard) => {
        this.saveInProgress = false;
        this.dashboard.version = dashboard.version;
      },
    );
  };

  if (_.has($location.search(), 'fullscreen')) {
    this.toggleFullscreen();
  }

  this.openShareForm = () => {
    // check if any of the wigets have query parameters
    const hasQueryParams = _.some(
      this.dashboard.widgets,
      w => !_.isEmpty(w.getQuery() && w.getQuery().getParametersDefs()),
    );

    ShareDashboardDialog.showModal({
      dashboard: this.dashboard,
      hasQueryParams,
    });
  };
}

export default function init(ngModule) {
  ngModule.component('dashboardPage', {
    template,
    controller: DashboardCtrl,
  });

  return {
    '/dashboard/:dashboardSlug': {
      template: '<dashboard-page></dashboard-page>',
      reloadOnSearch: false,
    },
  };
}

init.init = true;
