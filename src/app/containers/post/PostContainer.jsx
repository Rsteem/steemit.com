import React, { Component } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';

import Container from 'src/app/components/common/Container/Container';
import SidePanel from 'src/app/containers/post/SidePanel';
import PostContent from 'src/app/components/post/PostContent';
import ActivePanel from 'src/app/containers/post/ActivePanel';
import AboutPanel from 'src/app/containers/post/AboutPanel';
import { USER_FOLLOW_DATA_LOAD } from 'src/app/redux/constants/followers';
import { FAVORITES_LOAD } from 'src/app/redux/constants/favorites';
import LoadingIndicator from 'app/components/elements/LoadingIndicator';
import CommentsContainer from 'src/app/containers/post/CommentsContainer';
import RegistrationPanel from 'src/app/containers/post/RegistrationPanel';
import { postContainerSelector } from 'src/app/redux/selectors/post/postContainer';

const Wrapper = styled.div`
    width: 100%;
    height: 100%;
    background-color: #f9f9f9;
`;

const ContentWrapper = styled(Container)`
    position: relative;
    padding-top: 22px;
    padding-bottom: 17px;
    display: flex;
    flex-direction: column;

    @media (max-width: 576px) {
        margin: 0;
        padding-top: 0;
    }
`;

const Loader = styled(LoadingIndicator)`
    margin-top: 30px;
`;

@connect(
    postContainerSelector,
    {
        loadUserFollowData: username => ({
            type: USER_FOLLOW_DATA_LOAD,
            payload: {
                username,
            },
        }),
        loadFavorites: () => ({
            type: FAVORITES_LOAD,
            payload: {},
        }),
    }
)
export default class PostContainer extends Component {
    componentDidMount() {
        this.props.loadUserFollowData(this.props.account);
        this.props.loadFavorites();
    }

    render() {
        const { postLoaded, isUserAuth } = this.props;

        if (!postLoaded) return <Loader type="circle" center size={40} />;
        return (
            <Wrapper>
                <ContentWrapper>
                    <PostContent />
                    <ActivePanel />
                    <AboutPanel />
                    <SidePanel />
                    <CommentsContainer />
                    {!isUserAuth && <RegistrationPanel />}
                </ContentWrapper>
            </Wrapper>
        );
    }
}