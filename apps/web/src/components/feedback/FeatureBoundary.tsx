import { Component, type ReactNode } from "react";

export class FeatureBoundary extends Component<
  {
    children: ReactNode;
    fallback: ReactNode;
  },
  {
    hasError: boolean;
  }
> {
  override state = {
    hasError: false
  };

  static getDerivedStateFromError() {
    return {
      hasError: true
    };
  }

  override componentDidCatch() {}

  override render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
