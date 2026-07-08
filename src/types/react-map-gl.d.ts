declare module 'react-map-gl/mapbox' {
  import * as React from 'react';

  export interface ViewState {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch?: number;
    bearing?: number;
  }

  export interface MapProps extends React.PropsWithChildren<any> {
    mapboxAccessToken?: string;
    initialViewState?: Partial<ViewState>;
    mapStyle?: string;
    style?: React.CSSProperties;
    onMove?: (evt: { viewState: ViewState }) => void;
  }

  export class Map extends React.Component<MapProps> {}

  export interface MarkerProps extends React.PropsWithChildren<any> {
    longitude: number;
    latitude: number;
    color?: string;
    anchor?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  }

  export class Marker extends React.Component<MarkerProps> {}

  export interface NavigationControlProps {
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    showCompass?: boolean;
    showZoom?: boolean;
    visualizePitch?: boolean;
  }

  export class NavigationControl extends React.Component<NavigationControlProps> {}
}
