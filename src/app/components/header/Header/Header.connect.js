import { connect } from 'react-redux';

import user from 'app/redux/User';
import {
    getNotificationsOnlineHistoryFreshCount,
    getNotificationsOnlineHistory,
} from 'src/app/redux/actions/notificationsOnline';
import { statusSelector } from 'src/app/redux/selectors/common';

import Header from './Header';

export default connect(
    state => {
        const currentAccountName = state.user.getIn(['current', 'username']);

        let votingPower = null,
            realName = null;

        if (currentAccountName) {
            votingPower =
                state.global.getIn(['accounts', currentAccountName, 'voting_power']) / 100;
            realName =
                JSON.parse(state.global.getIn(['accounts', currentAccountName, 'json_metadata']))
                    .profile.name || currentAccountName;
        }

        const notificationsOnlineStatus = statusSelector('notificationsOnline')(state);

        return {
            freshCount: notificationsOnlineStatus.get('freshCount'),
            currentAccountName,
            votingPower,
            realName,
            offchainAccount: state.offchain.get('account'),
        };
    },
    {
        onLogin: () => user.actions.showLogin(),
        onLogout: () => user.actions.logout(),
        getNotificationsOnlineHistoryFreshCount,
        getNotificationsOnlineHistory,
    }
)(Header);
