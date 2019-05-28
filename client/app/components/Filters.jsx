import { isArray, map, includes, every, some } from 'lodash';
import moment from 'moment';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import Select from 'antd/lib/select';
import { clientConfig } from '@/services/auth';
import { formatDateTime } from '@/filters/datetime';

const ALL_VALUES = '###Redash::Filters::SelectAll###';
const NONE_VALUES = '###Redash::Filters::Clear###';

export const FilterType = PropTypes.shape({
  name: PropTypes.string.isRequired,
  friendlyName: PropTypes.string.isRequired,
  multiple: PropTypes.bool,
  current: PropTypes.oneOfType([
    PropTypes.any,
    PropTypes.arrayOf(PropTypes.any),
  ]).isRequired,
  values: PropTypes.arrayOf(PropTypes.any).isRequired,
});

export const FiltersType = PropTypes.arrayOf(FilterType);

function createFilterChangeHandler(filters, onChange) {
  return (filter, value) => {
    if (filter.multiple && includes(value, ALL_VALUES)) {
      value = [...filter.values];
    }
    if (filter.multiple && includes(value, NONE_VALUES)) {
      value = [];
    }
    filters = map(filters, f => (f.name === filter.name ? { ...filter, current: value } : f));
    onChange(filters);
  };
}

export function filterData(rows, filters = []) {
  if (!isArray(rows)) {
    return [];
  }

  let result = rows;

  if (isArray(filters) && (filters.length > 0)) {
    // "every" field's value should match "some" of corresponding filter's values
    result = result.filter(row => every(
      filters,
      (filter) => {
        const rowValue = row[filter.name];
        const filterValues = isArray(filter.current) ? filter.current : [filter.current];
        return some(filterValues, (filterValue) => {
          if (moment.isMoment(rowValue)) {
            const formattedValue = rowValue.format(clientConfig.dateTimeFormat);
            return formattedValue === filterValue;
          }
          // We compare with either the value or the String representation of the value,
          // because Select2 casts true/false to "true"/"false".
          return (filterValue === rowValue) || (String(rowValue) === filterValue);
        });
      },
    ));
  }

  return result;
}

function formatValue(value) {
  if (moment.isMoment(value)) {
    return formatDateTime(value);
  }

  return value;
}

export function Filters({ filters, onChange }) {
  if (filters.length === 0) {
    return null;
  }

  onChange = createFilterChangeHandler(filters, onChange);

  return (
    <div className="filters-wrapper">
      <div className="parameter-container container bg-white">
        <div className="row">
          {map(filters, (filter) => {
            const options = map(filter.values, value => (
              <Select.Option key={formatValue(value)}>{formatValue(value)}</Select.Option>
            ));

            return (
              <div key={filter.name} className="col-sm-6 p-l-0 filter-container">
                <label>{filter.friendlyName}</label>
                <Select
                  className="w-100"
                  mode={filter.multiple ? 'multiple' : 'default'}
                  value={formatValue(filter.current)}
                  allowClear={filter.multiple}
                  showSearch
                  onChange={value => onChange(filter, value)}
                >
                  {!filter.multiple && options}
                  {filter.multiple && [
                    <Select.Option key={NONE_VALUES}><i className="fa fa-square-o m-r-5" />Clear</Select.Option>,
                    <Select.Option key={ALL_VALUES}><i className="fa fa-check-square-o m-r-5" />Select All</Select.Option>,
                    <Select.OptGroup key="Values" title="Values">{options}</Select.OptGroup>,
                  ]}
                </Select>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

Filters.propTypes = {
  filters: FiltersType.isRequired,
  onChange: PropTypes.func, // (name, value) => void
};

Filters.defaultProps = {
  onChange: () => {},
};

export default function init(ngModule) {
  ngModule.component('filters', react2angular(Filters));
}

init.init = true;
