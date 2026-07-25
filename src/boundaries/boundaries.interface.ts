import { MultiPolygon } from "geojson";

export interface Boundaries {
  id: number;
  name: string;
  geom: MultiPolygon;
}
