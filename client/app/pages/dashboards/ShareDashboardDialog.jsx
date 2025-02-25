import { replace } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import Switch from 'antd/lib/switch';
import Modal from 'antd/lib/modal';
import Form from 'antd/lib/form';
import Alert from 'antd/lib/alert';
import { $http } from '@/services/ng';
import notification from '@/services/notification';
import { wrap as wrapDialog, DialogPropType } from '@/components/DialogWrapper';
import InputWithCopy from '@/components/InputWithCopy';
import { HelpTrigger } from '@/components/HelpTrigger';

const API_SHARE_URL = 'api/dashboards/{id}/share';

class ShareDashboardDialog extends React.Component {
  static propTypes = {
    dashboard: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    hasQueryParams: PropTypes.bool.isRequired,
    dialog: DialogPropType.isRequired,
  };

  formItemProps = {
    labelCol: { span: 8 },
    wrapperCol: { span: 16 },
    style: { marginBottom: 7 },
  };

  constructor(props) {
    super(props);
    const { dashboard } = this.props;

    this.state = {
      saving: false,
    };

    this.apiUrl = replace(API_SHARE_URL, '{id}', dashboard.id);
    this.disabled = this.props.hasQueryParams && !dashboard.publicAccessEnabled;
  }

  static get headerContent() {
    return (
      <React.Fragment>
        Share Dashboard
        <div className="modal-header-desc">
          Allow public access to this dashboard with a secret address.{' '}
          <HelpTrigger type="SHARE_DASHBOARD" />
        </div>
      </React.Fragment>
    );
  }

  addRefreshToPublicUrl = () => {
    const { dashboard } = this.props;
    if (dashboard.refreshRate) dashboard.public_url += '&refresh=' + dashboard.refreshRate.rate;
  }

  enableAccess = () => {
    const { dashboard } = this.props;
    this.setState({ saving: true });

    $http
      .post(this.apiUrl)
      .success((data) => {
        dashboard.publicAccessEnabled = true;
        dashboard.public_url = data.public_url;
        this.addRefreshToPublicUrl();
      })
      .error(() => {
        notification.error('Failed to turn on sharing for this dashboard');
      })
      .finally(() => {
        this.setState({ saving: false });
      });
  };

  disableAccess = () => {
    const { dashboard } = this.props;
    this.setState({ saving: true });

    $http
      .delete(this.apiUrl)
      .success(() => {
        dashboard.publicAccessEnabled = false;
        delete dashboard.public_url;
      })
      .error(() => {
        notification.error('Failed to turn off sharing for this dashboard');
      })
      .finally(() => {
        this.setState({ saving: false });
      });
  };

  onChange = (checked) => {
    if (checked) {
      this.enableAccess();
    } else {
      this.disableAccess();
    }
  };

  render() {
    const { dialog, dashboard } = this.props;

    return (
      <Modal
        {...dialog.props}
        title={this.constructor.headerContent}
        footer={null}
      >
        <Form layout="horizontal">
          {this.props.hasQueryParams && (
            <Form.Item>
              <Alert
                message="Sharing is currently not supported for dashboards containing queries with parameters."
                type="error"
              />
            </Form.Item>
          )}
          <Form.Item label="Allow public access" {...this.formItemProps}>
            <Switch
              checked={dashboard.publicAccessEnabled}
              onChange={this.onChange}
              loading={this.state.saving}
              disabled={this.disabled}
            />
          </Form.Item>
          {dashboard.public_url && (
            <Form.Item label="Secret address" {...this.formItemProps}>
              <InputWithCopy value={dashboard.public_url} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    );
  }
}

export default wrapDialog(ShareDashboardDialog);
