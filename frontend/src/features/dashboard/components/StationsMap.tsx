import React from 'react';
import { Station } from '../types';
import { StationNode } from './StationNode';

export type StationsMapProps = {
  stations: Station[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

export const StationsMap: React.FC<StationsMapProps> = ({ stations, selectedId, onSelect }) => {
  return (
    <div className="map" role="grid" aria-label="Mappa postazioni">
      {stations.map((s) => (
        <div role="gridcell" key={s.id}>
          <StationNode station={s} selected={s.id === selectedId} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
};
