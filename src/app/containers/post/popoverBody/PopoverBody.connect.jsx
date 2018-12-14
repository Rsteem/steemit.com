import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import { currentUsernameSelector, globalSelector } from 'src/app/redux/selectors/common';
import { authorSelector } from 'src/app/redux/selectors/post/commonPost';
import { USER_PINNED_POSTS_LOAD } from 'src/app/redux/constants/pinnedPosts';
import { PopoverBody } from 'src/app/containers/post/popoverBody/PopoverBody';
import { repLog10 } from 'app/utils/ParsersAndFormatters';

export default connect(
    createSelector(
        [
            authorSelector,
            currentUsernameSelector,
            (state, props) => globalSelector(['accounts', props.currentAccoun])(state),
        ],
        (author, currentUsername, user) => {
            if (!user) {
                return {};
            }

            return {
                account: author.account,
                name: author.name,
                about: author.about,
                followerCount: author.followerCount,
                pinnedPosts: author.pinnedPosts,
                pinnedPostsUrls: author.pinnedPostsUrls,
                showFollowBlock: author.account !== currentUsername,
                reputation: repLog10(user.get('reputation')),
            };
        }
    ),

    {
        getPostContent: urls => ({
            type: USER_PINNED_POSTS_LOAD,
            payload: {
                urls,
            },
        }),
    }
)(PopoverBody);
