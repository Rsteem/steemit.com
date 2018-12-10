import React, { Component, createRef } from 'react';
import { Link } from 'react-router';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import is from 'styled-is';
import by from 'styled-by';
import tt from 'counterpart';
import throttle from 'lodash/throttle';

import Icon from 'src/app/components/golos-ui/Icon';

import ShareList from 'src/app/components/post/ShareList';
import { PopoverStyled } from 'src/app/components/post/PopoverAdditionalStyles';
import PostActions from 'src/app/components/post/PostActions';
import { POST_MAX_WIDTH } from 'src/app/containers/post/PostContainer';
import VotePanel from 'src/app/components/common/VotePanel';
import Repost from 'src/app/components/post/repost';
import { logClickAnalytics } from 'src/app/helpers/gaLogs';

const HEADER_HEIGHT = 60;
const DESKTOP_FOOTER_HEIGHT = 324;
const PANEL_MARGIN = 20;
const SIDE_PANEL_WIDTH = 64;

const PanelWrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 15px 12px;
    border-radius: 32px;
    background-color: #ffffff;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.15s, visibility 0.15s;

    & > * {
        padding: 10px;
        flex-shrink: 0;
    }

    ${is('isVisible')`
        visibility: visible;
        opacity: 1;
    `};
`;

const Wrapper = styled.div`
    visibility: hidden;
    position: fixed;
    left: calc(50% - ${() => POST_MAX_WIDTH / 2 + SIDE_PANEL_WIDTH * 1.5}px);
    z-index: 2;

    width: ${SIDE_PANEL_WIDTH}px;
    min-height: 50px;

    ${is('showSideBlock')`
        visibility: visible
    `};

    ${by('fixedOn', {
        center: `
            bottom: calc(50% - ${HEADER_HEIGHT / 2}px);
            transform: translateY(50%);
        `,
        bottom: `
            position: absolute;
            bottom: ${PANEL_MARGIN}px;
            transform: translateY(0);
        `,
    })};
`;

const BackIcon = styled(Icon)`
    display: block;
    width: 50px;
    height: 50px;
    padding: 13px;
    color: #393636;
`;

const BackLink = styled(Link)`
    display: flex;
    justify-content: center;
    align-items: center;

    width: ${SIDE_PANEL_WIDTH}px;
    height: ${SIDE_PANEL_WIDTH}px;
    margin-top: 40px;

    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.7);
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    cursor: pointer;

    &:hover {
        background-color: #ffffff;
    }

    &:hover ${BackIcon} {
        color: #2879ff;
    }
`;

const ActionWrapper = styled.div`
    display: flex;
    align-items: center;
    flex-direction: column;

    * {
        color: ${({ activeType }) =>
            activeType === 'like' ? '#2879ff' : activeType === 'dislike' ? '#ff4e00' : ''};
    }
`;

const IconWrapper = styled.div`
    display: flex;
    cursor: pointer;
    transition: transform 0.15s;

    &:hover {
        transform: scale(1.15);
    }
`;

const ShareWrapper = styled(ActionWrapper)`
    position: relative;
`;

const IconWithState = styled(({ isOpen, ...rest }) => <Icon {...rest} />)`
    ${is('isOpen')`
        transition: color 0s;
        color: #2879ff;
    `};
`;

const WrapperVotePanel = styled(VotePanel)`
    padding-bottom: 0;
`;

export class SidePanel extends Component {
    static propTypes = {
        togglePin: PropTypes.func.isRequired,
        toggleFavorite: PropTypes.func.isRequired,
    };

    state = {
        showSharePopover: false,
        fixedOn: 'center',
        showSideBlockByWidth: true,
        showSideBlockByHeight: true,
        showPanel: true,
        backURL: this.props.backURL,
    };

    sideBlockRef = createRef();
    panelRef = createRef();

    componentDidMount() {
        this.scrollScreenLazy();
        this.resizeScreenLazy();
        window.addEventListener('scroll', this.scrollScreenLazy);
        window.addEventListener('resize', this.resizeScreenLazy);
    }

    componentWillUnmount() {
        window.removeEventListener('scroll', this.scrollScreenLazy);
        window.removeEventListener('resize', this.resizeScreenLazy);
        this.scrollScreenLazy.cancel();
        this.resizeScreenLazy.cancel();
    }

    checkPanelPosition = () => {
        const { postContentRef } = this.props;
        const { showPanel } = this.state;

        if (!postContentRef || !postContentRef.current) {
            return;
        }

        const postBottom = postContentRef.current.getBoundingClientRect().bottom;
        const panelBottom = this.panelRef.current.getBoundingClientRect().bottom;

        if (postBottom < panelBottom && showPanel) {
            this.setState({ showPanel: false });
        } else if (postBottom >= panelBottom && !showPanel) {
            this.setState({ showPanel: true });
        }
    };

    scrollScreen = () => {
        const panelRect = this.sideBlockRef.current.getBoundingClientRect();

        const documentElem = document.documentElement;
        const bottomBorder = documentElem.scrollHeight - DESKTOP_FOOTER_HEIGHT;
        const offsetBottomOfScreen =
            documentElem.scrollTop +
            documentElem.clientHeight / 2 +
            panelRect.height / 2 +
            HEADER_HEIGHT / 2 +
            PANEL_MARGIN;

        let newFixedOn = 'center';
        if (bottomBorder <= offsetBottomOfScreen) {
            newFixedOn = 'bottom';
        }

        if (this.state.fixedOn !== newFixedOn) {
            this.setState({
                fixedOn: newFixedOn,
            });
        }

        this.checkPanelPosition();
    };

    scrollScreenLazy = throttle(this.scrollScreen, 20);

    resizeScreen = () => {
        const { showSideBlockByWidth, showSideBlockByHeight } = this.state;
        const panelRect = this.sideBlockRef.current.getBoundingClientRect();
        const leftBorder = POST_MAX_WIDTH + SIDE_PANEL_WIDTH * 2.8 + PANEL_MARGIN * 2;
        const topBorder = panelRect.height + HEADER_HEIGHT + PANEL_MARGIN * 2;

        const documentElem = document.documentElement;
        const documentWidth = documentElem.clientWidth;
        const documentHeight = documentElem.clientHeight;

        if (documentHeight < topBorder && showSideBlockByHeight) {
            this.setState({ showSideBlockByHeight: false });
        }
        if (documentHeight >= topBorder && !showSideBlockByHeight) {
            this.setState({ showSideBlockByHeight: true }, () => this.scrollScreenLazy());
        }
        if (documentWidth < leftBorder && showSideBlockByWidth) {
            this.setState({ showSideBlockByWidth: false });
        }
        if (documentWidth >= leftBorder && !showSideBlockByWidth) {
            this.setState({ showSideBlockByWidth: true }, () => this.scrollScreenLazy());
        }
    };

    resizeScreenLazy = throttle(this.resizeScreen, 20);

    openSharePopover = () => {
        this.setState({
            showSharePopover: true,
        });
    };

    closeSharePopover = () => {
        this.setState({
            showSharePopover: false,
        });
    };

    onBackClick = () => {
        this.props.onBackClick(this.state.backURL);
        logClickAnalytics('Button', 'Back to previous page');
    };

    render() {
        const { post, isPinned, togglePin, isOwner, toggleFavorite, contentLink } = this.props;
        const {
            showSharePopover,
            fixedOn,
            showSideBlockByWidth,
            showSideBlockByHeight,
            showPanel,
            backURL,
        } = this.state;

        const shareTooltip = showSharePopover
            ? undefined
            : tt('postfull_jsx.share_in_social_networks');

        return (
            <Wrapper
                innerRef={this.sideBlockRef}
                fixedOn={fixedOn}
                showSideBlock={showSideBlockByWidth && showSideBlockByHeight}
            >
                <PanelWrapper innerRef={this.panelRef} isVisible={showPanel}>
                    <WrapperVotePanel contentLink={contentLink} vertical />
                    <Repost contentLink={contentLink} />
                    <ShareWrapper
                        onClick={this.openSharePopover}
                        role="button"
                        data-tooltip={shareTooltip}
                        aria-label={shareTooltip}
                    >
                        <IconWrapper>
                            <IconWithState
                                width="20"
                                height="20"
                                name="sharing_triangle"
                                isOpen={showSharePopover}
                            />
                        </IconWrapper>
                        <PopoverStyled
                            position="right"
                            onClose={this.closeSharePopover}
                            show={showSharePopover}
                        >
                            <ShareList post={post} />
                        </PopoverStyled>
                    </ShareWrapper>
                    <PostActions
                        fullUrl={post.url}
                        isFavorite={post.isFavorite}
                        isPinned={isPinned}
                        isOwner={isOwner}
                        toggleFavorite={toggleFavorite}
                        togglePin={togglePin}
                    />
                </PanelWrapper>
                {backURL !== window.location.pathname && (
                    <BackLink
                        to={backURL}
                        role="button"
                        data-tooltip={tt('g.turn_back')}
                        aria-label={tt('g.turn_back')}
                        onClick={this.onBackClick}
                    >
                        <BackIcon name="arrow_left" />
                    </BackLink>
                )}
            </Wrapper>
        );
    }
}
