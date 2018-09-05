import React, { Component } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import Icon from '../../components/golos-ui/Icon/Icon';

const Wrapper = styled.div`
    width: 64px;
    min-height: 50px;
    padding: 15px 22px;
    border-radius: 32px;
    background-color: #ffffff;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.6);

    & > div {
        padding: 10px 0;
    }
`;

const CountOf = styled.div`
    padding-top: 5px;
    color: #959595;
    font-family: 'Open Sans', sans-serif;
    font-size: 16px;
    line-height: 23px;
`;

const ActionButton = styled.div`
    display: flex;
    align-items center;
    flex-direction: column;
`;

const ActionIcon = Icon.extend`
    padding: 5px;
    cursor: pointer;
    transition: transform 0.15s;

    &:hover {
        transform: scale(1.15);
    }
`;

const ActionBlock = ({ iconName, count }) => {
    return (
        <ActionButton>
            <ActionIcon width="34" height="34" name={iconName} />
            <CountOf>{count}</CountOf>
        </ActionButton>
    );
};

class SidePanel extends Component {
    static propTypes = {};

    static defaultProps = {};

    constructor() {
        super();
    }

    componentDidMount() {
        window.addEventListener('scroll', () => {console.log(this.wrapperRef.offsetTop);});
    }

    render() {
        const { className, actionsData } = this.props;
        return (
            <Wrapper className={className} innerRef={this._setWrapperRef}>
                {actionsData.map((action, index) => {
                    return (
                        <ActionBlock key={index} iconName={action.iconName} count={action.count} />
                    );
                })}
            </Wrapper>
        );
    }

    _setWrapperRef = ref => {
        this.wrapperRef = ref
    }
}

const mapStateToProps = (state, props) => {
    const url = props.post.get('url');
    //state.global.getIn(['content', props.permLink])
    const content = state.global.getIn(['content', url.replace(/.+@(.+)/, '$1')]);
    console.log();

    const actionsData = [
        {
            iconName: 'like',
            count: 20,
        },
        {
            iconName: 'dislike',
            count: 18,
        },
        {
            iconName: 'repost-right',
            count: 20,
        },
        {
            iconName: 'sharing_triangle',
            count: null,
        },
        {
            iconName: 'star',
            count: null,
        },
    ];
    return {
        actionsData
    };
};

const mapDispatchToProps = (dispatch, props) => {
    return {};
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(SidePanel);
