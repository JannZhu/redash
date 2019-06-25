// import numberFormat from 'underscore.string/numberFormat';
import { isNumber } from 'lodash';
import { angular2react } from 'angular2react';
import { registerVisualization } from '@/visualizations';

import sumTemplate from './sum.html';
import sumEditorTemplate from './sum-editor.html';

const DEFAULT_OPTIONS = {
  sumLabel: '',
  sumColName: 'sum',
  rowNumber: 1,
  targetRowNumber: 1,
  stringDecimal: 0,
  stringDecChar: '.',
  stringThouSep: ',',
};

// TODO: Need to review this function, it does not properly handle edge cases.
function getRowNumber(index, size) {
  if (index >= 0) {
    return index - 1;
  }

  if (Math.abs(index) > size) {
    index %= size;
  }

  return size + index;
}

const SumRenderer = {
  template: sumTemplate,
  bindings: {
    data: '<',
    options: '<',
    visualizationName: '<',
  },
  controller($scope, $element, $timeout) {
    $scope.fontSize = '1em';

    $scope.scale = 1;
    const root = $element[0].querySelector('sum');
    const container = $element[0].querySelector('sum > div');
    $scope.handleResize = () => {
      const scale = Math.min(root.offsetWidth / container.offsetWidth, root.offsetHeight / container.offsetHeight);
      $scope.scale = Math.floor(scale * 100) / 100; // keep only two decimal places
    };

    const update = () => {
      const sumlist = this.options.sumlist;
      const data = this.data.rows;
      if (data.length > 0) {
        sumlist.forEach((item) => {
          const rowNumber = getRowNumber(item.rowNumber, data.length);
          item.sumValue = data[rowNumber][item.sumColName];
        })
      };

      // if (data.length > 0) {
      //   const rowNumber = getRowNumber(options.rowNumber, data.length);
      //   const targetRowNumber = getRowNumber(options.targetRowNumber, data.length);
      //   const sumColName = options.sumColName;
      //   const targetColName = options.targetColName;
      //   const sumLabel = options.sumLabel;

      //   if (sumLabel) {
      //     $scope.sumLabel = sumLabel;
      //   } else {
      //     $scope.sumLabel = this.visualizationName;
      //   }

      //   if (options.sumRow) {
      //     $scope.sumValue = data.length;
      //   } else if (sumColName) {
      //     $scope.sumValue = data[rowNumber][sumColName];
      //   }
      //   if (targetColName) {
      //     $scope.targetValue = data[targetRowNumber][targetColName];

      //     if ($scope.targetValue) {
      //       $scope.delta = $scope.sumValue - $scope.targetValue;
      //       $scope.trendPositive = $scope.delta >= 0;
      //     }
      //   } else {
      //     $scope.targetValue = null;
      //   }

      //   $scope.isNumber = isNumber($scope.sumValue);
      //   if ($scope.isNumber) {
      //     $scope.stringPrefix = options.stringPrefix;
      //     $scope.stringSuffix = options.stringSuffix;

      //     const stringDecimal = options.stringDecimal;
      //     const stringDecChar = options.stringDecChar;
      //     const stringThouSep = options.stringThouSep;
      //     if (stringDecimal || stringDecChar || stringThouSep) {
      //       $scope.sumValue = numberFormat($scope.sumValue, stringDecimal, stringDecChar, stringThouSep);
      //       $scope.isNumber = false;
      //     }
      //   } else {
      //     $scope.stringPrefix = null;
      //     $scope.stringSuffix = null;
      //   }
      // }
      $scope.sumlist = sumlist

      $timeout(() => {
        $scope.handleResize();
      });
    };

    $scope.$watch('$ctrl.data', update);
    $scope.$watch('$ctrl.options', update, true);
  },
};

const SumEditor = {
  template: sumEditorTemplate,
  bindings: {
    data: '<',
    options: '<',
    visualizationName: '<',
    onOptionsChange: '<',
  },
  controller($scope) {
    this.currentTab = 'general';
    this.changeTab = (tab) => {
      this.currentTab = tab;
    };

    // this.isValueNumber = () => {
    //   const options = this.options;
    //   const data = this.data.rows;

    //   if (data.length > 0) {
    //     const rowNumber = getRowNumber(options.rowNumber, data.length);
    //     const sumColName = options.sumColName;

    //     if (options.sumRow) {
    //       this.sumValue = data.length;
    //     } else if (sumColName) {
    //       this.sumValue = data[rowNumber][sumColName];
    //     }
    //   }

    //   return isNumber(this.sumValue);
    // };

    this.addRows = () => {
      if (this.options.sumlist) {
        this.options.sumlist.push({ ...DEFAULT_OPTIONS });
      } else {
        this.options.sumlist = [];
      }
    };

    this.remove = (index) => {
      if(this.options.sumlist) {
        this.options.sumlist.splice(index, 1)
      }
    };
    // const update = () => {
    //   const sumlist = this.options.sumlist;
    //   const data = this.data.rows;
    //   if (data.length > 0) {
    //     sumlist.forEach((item) => {
    //       const rowNumber = getRowNumber(item.rowNumber, data.length);
    //       item.sumValue = data[rowNumber][item.sumColName];
    //     })
    //   };
    // }
    $scope.$watch('$ctrl.options', (options) => {
      debugger
      this.onOptionsChange(options);
      // update();
    }, true);
  },
};

export default function init(ngModule) {
  ngModule.component('sumRenderer', SumRenderer);
  ngModule.component('sumEditor', SumEditor);

  ngModule.run(($injector) => {
    registerVisualization({
      type: 'SUM',
      name: 'Sum',
      getOptions: options => options,
      Renderer: angular2react('sumRenderer', SumRenderer, $injector),
      Editor: angular2react('sumEditor', SumEditor, $injector),
      defaultColumns: 2,
      defaultRows: 5,
    });
  });
}

init.init = true;
