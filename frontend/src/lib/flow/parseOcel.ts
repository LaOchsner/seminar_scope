import type { ObjectFlowMapRecord, OcelEventData } from '~/types/ocel.types';

// OCEL 2.0 JSON structure as returned by the backend
interface Ocel2Event {
    id: string;
    type: string;
    time: string;
    attributes: unknown[];
    relationships: { objectId: string; qualifier: string }[];
}

interface Ocel2Object {
    id: string;
    type: string;
    attributes: unknown[];
    relationships: unknown[];
}

export interface Ocel2Response {
    eventTypes: { name: string; attributes: unknown[] }[];
    objectTypes: { name: string; attributes: unknown[] }[];
    events: Ocel2Event[];
    objects: Ocel2Object[];
}

/**
 * Converts OCEL 2.0 events into the flat OcelEventData[] format used by FlowWithAnimation.
 * The result is sorted by timestamp and only needs ocel:timestamp / ocel:activity for playback time range.
 */
export const flattenOcel2Events = (ocel: Ocel2Response): OcelEventData[] => {
    return [...ocel.events]
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
        .map((e) => ({
            'ocel:eid': e.id,
            'ocel:timestamp': e.time,
            'ocel:activity': e.type,
        }));
};

/**
 * Builds an ObjectFlowMapRecord from OCEL 2.0 data.
 * For each object, collects the ordered list of timestamps and activities
 * from events it participates in (via relationships).
 */
export const buildObjectFlowMap = (ocel: Ocel2Response): ObjectFlowMapRecord => {
    // objectId → capitalized type name
    const objectTypeById = new Map<string, string>();
    ocel.objects.forEach((obj) => {
        const capitalized = obj.type.charAt(0).toUpperCase() + obj.type.slice(1);
        objectTypeById.set(obj.id, capitalized);
    });

    const map: ObjectFlowMapRecord = new Map();

    const sortedEvents = [...ocel.events].sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    sortedEvents.forEach((event) => {
        event.relationships.forEach(({ objectId }) => {
            const objType = objectTypeById.get(objectId);
            if (!objType) return;

            const uniqueId = `${objType}-${objectId}`;
            if (!map.has(uniqueId)) {
                map.set(uniqueId, { id: objectId, type: objType, timestamps: [], activities: [] });
            }
            const entry = map.get(uniqueId)!;
            entry.timestamps.push(event.time);
            entry.activities.push(event.type);
        });
    });

    return map;
};
