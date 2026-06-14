import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
} from '~/components/ui/sidebar';
import DndCard from '~/components/explore/DndCard';
import { nodeRegistry, type SidebarGroup as NodeSidebarGroup, sidebarGroups } from '~/lib/explore/nodeRegistry';
import { getIconComponent } from '~/lib/iconMap';
import type { ExploreNodeType } from '~/types/explore/nodeTypesCategories';

interface SidebarEntry {
    type: ExploreNodeType;
    label: string;
    icon: string;
}

function getSidebarEntriesByGroup(group: NodeSidebarGroup): SidebarEntry[] {
    return Object.entries(nodeRegistry)
        .filter(([, entry]) => entry.sidebar?.group === group)
        .map(([type, entry]) => ({
            type: type as ExploreNodeType,
            label: entry.sidebar!.label,
            icon: entry.sidebar!.icon,
        }));
}

const ExploreSidebar: React.FC = () => {
    return (
        <Sidebar side="right">
            <SidebarContent>
                {(Object.keys(sidebarGroups) as NodeSidebarGroup[]).map((group) => {
                    const entries = getSidebarEntriesByGroup(group);
                    if (entries.length === 0) return null;

                    const { label, icon, menuClassName } = sidebarGroups[group];
                    const GroupIcon = getIconComponent(icon);

                    return (
                        <SidebarGroup key={group}>
                            <SidebarGroupLabel>
                                <GroupIcon />
                                <p className="ml-1">{label}</p>
                            </SidebarGroupLabel>
                            <SidebarGroupContent className="p-1">
                                <SidebarMenu className={menuClassName}>
                                    {entries.map(({ type, label: entryLabel, icon: entryIcon }) => (
                                        <SidebarMenuItem key={type}>
                                            <DndCard
                                                title={entryLabel}
                                                Icon={getIconComponent(entryIcon)}
                                                nodeType={type}
                                            />
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    );
                })}
            </SidebarContent>
        </Sidebar>
    );
};

export default ExploreSidebar;
