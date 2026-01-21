import type { LatLon } from './latlon.model';
import type { IRectangle } from './rectangle.model';

export interface IDrawnShape {
    kind: 'rectangle' | 'polygon' | 'circle';
    rect?: IRectangle;
    coordinates?: LatLon[];
    radius?: number;
}
