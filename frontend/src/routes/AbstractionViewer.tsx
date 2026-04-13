import { useParams } from 'react-router-dom';
import BreadcrumbNav from '~/components/BreadcrumbNav';
import Abstraction from '~/components/abstraction/Abstraction';
import { useExploreFlowStore } from '~/stores/exploreStore';
import { useGetAbstractionById } from '~/services/queries';

const AbstractionViewer: React.FC = () => {
    const { nodeId } = useParams<{ nodeId: string }>();
    const getNode = useExploreFlowStore((s) => s.getNode);

    const fileNode = nodeId ? getNode(nodeId) : undefined;
    const fileId = fileNode?.data.assets.find((a) => a.io === 'output')?.id ?? null;

    const { data, isLoading, isError } = useGetAbstractionById(fileId);

    const renderContent = () => {
        if (!fileId) {
            return (
                <p className="text-muted-foreground text-sm">
                    No abstraction data available. Return to the pipeline and ensure the Abstraction Miner has produced output.
                </p>
            );
        }

        if (isLoading) {
            return <p className="text-muted-foreground text-sm">Loading abstraction...</p>;
        }

        if (isError || !data) {
            return <p className="text-destructive text-sm">Failed to load abstraction data.</p>;
        }

        return <Abstraction abstraction={data.abstraction} />;
    };

    return (
        <div className="flex flex-col h-screen">
            <BreadcrumbNav />
            <div className="flex-1 min-h-0">
                {renderContent()}
            </div>
        </div>
    );
};

export default AbstractionViewer;
