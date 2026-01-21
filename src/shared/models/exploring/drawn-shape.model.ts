import type { LatLon } from './latlon.model';
import type { IRectangle } from './rectangle.model';

export interface IDrawnShape {
    kind: 'rectangle' | 'polygon';
    rect?: IRectangle;
    coordinates?: LatLon[];
}
