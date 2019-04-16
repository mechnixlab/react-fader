/* @flow */
/* eslint-env browser */

import * as React from 'react'
import { TransitionContext } from 'react-transition-context'
import Prefixer from 'inline-style-prefixer'

export type TransitionState = 'in' | 'out' | 'entering' | 'leaving'

export type DefaultProps = {
  fadeInTransitionDuration: number,
  fadeInTransitionTimingFunction: string,
  fadeOutTransitionDuration: number,
  fadeOutTransitionTimingFunction: string,
  sizeTransitionDuration: number,
  sizeTransitionTimingFunction: string,
  prefixer: Prefixer,
  style: Object,
  shouldTransition: (oldChildren: any, newChildren: any) => boolean,
}

export type Props = {
  animateHeight?: ?boolean,
  animateWidth?: ?boolean,
  innerRef?: (c: ?React.ElementRef<'div'>) => any,
  shouldTransition: (oldChildren: any, newChildren: any) => boolean,
  children?: React.Node,
  fadeInTransitionDuration: number,
  fadeInTransitionTimingFunction: string,
  fadeOutTransitionDuration: number,
  fadeOutTransitionTimingFunction: string,
  sizeTransitionDuration: number,
  sizeTransitionTimingFunction: string,
  prefixer: Prefixer,
  style: Object,
  className?: string,
}

export type State = {
  children: any,
  height: ?number,
  width: ?number,
  wrappedChildren: React.Element<any>,
  transitionState: TransitionState,
  transitioningSize: boolean,
}

export default class Fader extends React.Component<Props, State> {
  static defaultProps: DefaultProps = {
    fadeInTransitionDuration: 200,
    fadeInTransitionTimingFunction: 'linear',
    fadeOutTransitionDuration: 200,
    fadeOutTransitionTimingFunction: 'linear',
    sizeTransitionDuration: 200,
    sizeTransitionTimingFunction: 'ease',
    prefixer: new Prefixer(),
    style: {},
    shouldTransition(oldChildren: any, newChildren: any): boolean {
      if (oldChildren === newChildren) return false
      if (
        React.isValidElement(oldChildren) &&
        React.isValidElement(newChildren) &&
        oldChildren.key != null &&
        oldChildren.key === newChildren.key
      ) {
        return false
      }
      return true
    },
  }

  wrapChildren = (
    children: any,
    transitionState: TransitionState
  ): React.Element<'div'> => {
    const { animateWidth, prefixer } = this.props
    const style: Object = {
      display: animateWidth ? 'inline-flex' : 'flex',
      transitionProperty: 'opacity',
    }
    switch (transitionState) {
      case 'out':
      case 'entering':
        style.opacity = transitionState === 'entering' ? 1 : 0
        style.transitionDuration =
          this.props.fadeInTransitionTimingFunction + 'ms'
        style.transitionTimingFunction = this.props.fadeInTransitionTimingFunction
        break
      case 'in':
      case 'leaving':
        style.opacity = transitionState === 'in' ? 1 : 0
        style.transitionDuration = this.props.fadeOutTransitionDuration + 'ms'
        style.transitionTimingFunction = this.props.fadeOutTransitionTimingFunction
        break
    }
    return (
      <div
        data-transition-state={transitionState}
        style={prefixer.prefix(style)}
      >
        <div style={{ width: '100%' }} ref={c => (this.wrappedChildrenRef = c)}>
          <TransitionContext state={transitionState}>
            {children}
          </TransitionContext>
        </div>
      </div>
    )
  }

  wrappedChildrenRef: ?HTMLElement
  timeouts: { [name: string]: any } = {}

  state: State = {
    children: this.props.children,
    height: undefined,
    width: undefined,
    wrappedChildren: this.wrapChildren(this.props.children, 'in'),
    transitionState: 'in',
    transitioningSize: false,
  }

  setTimeout(name: string, callback: () => any, delay: number) {
    if (this.timeouts[name]) clearTimeout(this.timeouts[name])
    this.timeouts[name] = setTimeout(callback, delay)
  }

  componentDidUpdate() {
    const { transitionState, height, width, transitioningSize } = this.state
    const { animateHeight, animateWidth } = this.props
    const shouldTransition = this.props.shouldTransition(
      this.state.children,
      this.props.children
    )

    if (transitionState === 'in' && shouldTransition) {
      const newState: $Shape<State> = {}
      newState.children = this.props.children
      newState.transitionState = 'leaving'
      newState.wrappedChildren = this.wrapChildren(
        this.state.children,
        'leaving'
      )
      this.setTimeout(
        'fadeOut',
        this.onTransitionEnd,
        this.props.fadeOutTransitionDuration
      )
      if (animateHeight && height === undefined && this.wrappedChildrenRef) {
        newState.height = this.wrappedChildrenRef.clientHeight
      }
      if (animateWidth && width === undefined && this.wrappedChildrenRef) {
        newState.width = this.wrappedChildrenRef.clientWidth
      }
      this.setState(newState)
    } else if (
      transitionState === 'leaving' &&
      (animateHeight || animateWidth)
    ) {
      if (!transitioningSize) this.setState({ transitioningSize: true })
    } else if (transitionState === 'out') {
      const newState: $Shape<State> = {}
      if (shouldTransition) {
        newState.children = this.props.children
        newState.wrappedChildren = this.wrapChildren(this.props.children, 'out')
      } else {
        newState.transitionState = 'entering'
        newState.children = this.props.children
        newState.wrappedChildren = this.wrapChildren(
          this.props.children,
          'entering'
        )
        this.setTimeout(
          'fadeIn',
          this.onTransitionEnd,
          this.props.fadeInTransitionDuration
        )
        if (animateHeight) {
          if (this.wrappedChildrenRef) {
            newState.height = this.wrappedChildrenRef.clientHeight
          }
          this.setTimeout(
            'height',
            this.onSizeTransitionEnd,
            this.props.sizeTransitionDuration
          )
        }
        if (animateWidth) {
          if (this.wrappedChildrenRef) {
            newState.width = this.wrappedChildrenRef.clientWidth
          }
          this.setTimeout(
            'width',
            this.onSizeTransitionEnd,
            this.props.sizeTransitionDuration
          )
        }
      }
      this.setState(newState)
    } else if (
      !shouldTransition &&
      this.state.children !== this.props.children
    ) {
      const newState: $Shape<State> = {}
      newState.children = this.props.children
      newState.wrappedChildren = this.wrapChildren(
        this.props.children,
        transitionState
      )
      this.setState(newState)
    }
  }

  onTransitionEnd = (e?: Event) => {
    const { shouldTransition } = this.props
    const { transitionState } = this.state
    if (transitionState === 'leaving') {
      this.setState({
        transitionState: 'out',
        wrappedChildren: this.wrapChildren(this.props.children, 'out'),
      })
    } else if (transitionState === 'entering') {
      if (shouldTransition(this.state.children, this.props.children)) {
        this.setState({
          transitionState: 'leaving',
          wrappedChildren: this.wrapChildren(this.state.children, 'leaving'),
        })
        this.setTimeout(
          'fadeOut',
          this.onTransitionEnd,
          this.props.fadeOutTransitionDuration
        )
      } else {
        this.setState({
          transitionState: 'in',
          height: undefined,
          width: undefined,
          wrappedChildren: this.wrapChildren(this.props.children, 'in'),
        })
      }
    }
  }
  onSizeTransitionEnd = (e?: Event) => {
    this.setState({ transitioningSize: false })
  }

  componentWillUnmount() {
    for (let name in this.timeouts) clearTimeout(this.timeouts[name])
  }

  render(): React.Element<'div'> {
    const { height, width, transitioningSize, wrappedChildren } = this.state
    const { animateWidth, className, prefixer, innerRef } = this.props
    const style = {
      height,
      width,
      display: animateWidth ? 'inline-block' : 'block',
      ...this.props.style,
    }
    if (transitioningSize) {
      const {
        sizeTransitionDuration,
        sizeTransitionTimingFunction,
      } = this.props
      style.overflow = 'hidden'
      style.transition = `height ${sizeTransitionDuration}ms ${sizeTransitionTimingFunction}, width ${sizeTransitionDuration}ms ${sizeTransitionTimingFunction}`
    }
    return (
      <div className={className} style={prefixer.prefix(style)} ref={innerRef}>
        {wrappedChildren}
      </div>
    )
  }
}
