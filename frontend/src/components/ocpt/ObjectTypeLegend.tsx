import { LegendItem, LegendLabel, LegendOrdinal } from '@visx/legend';
import { ScaleOrdinal } from 'd3';
import { Checkbox } from '~/components/ui/checkbox';
import { useFilteredObjectType } from '~/stores/store';

interface ObjectTypeLegendProps {
    objectTypes: string[];
    coloring: ScaleOrdinal<string, string, never>;
    nodeId: string | undefined;
}

const ObjectTypeLegend: React.FC<ObjectTypeLegendProps> = ({ objectTypes, coloring, nodeId }: ObjectTypeLegendProps) => {
    const { filteredObjectTypes, setFilteredObjectTypes } = useFilteredObjectType();
    const currentFilteredOts = nodeId ? filteredObjectTypes.get(nodeId) || [] : [];

    if (!objectTypes) {
        return <div>Loading Legend</div>;
    }

    const handleCheckboxChange = (objectType: string) => {
        if (nodeId) {
            const newFilteredObjectTypes = currentFilteredOts.includes(objectType)
                ? currentFilteredOts.filter((ot) => ot !== objectType)
                : [...currentFilteredOts, objectType];
            setFilteredObjectTypes(nodeId, newFilteredObjectTypes);
        }
    };

    return (
        <LegendOrdinal scale={coloring}>
            {(labels) => (
                <div className="flex flex-col">
                    {labels.map((label, i) => (
                        <LegendItem key={`legend-quantile-${i}`} margin="0 5px">
                            <Checkbox
                                style={{
                                    borderColor: label.value,
                                    backgroundColor: currentFilteredOts.includes(label.text) ? label.value : 'white',
                                }}
                                checked={currentFilteredOts.includes(label.text)}
                                onCheckedChange={() => handleCheckboxChange(label.text)}
                            />
                            <LegendLabel align="left" margin="0 0 0 4px">
                                {label.text}
                            </LegendLabel>
                        </LegendItem>
                    ))}
                </div>
            )}
        </LegendOrdinal>
    );
};

export default ObjectTypeLegend;
