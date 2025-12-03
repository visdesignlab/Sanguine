import {
    useContext, useEffect, useRef, useState,
} from 'react';
import { observer } from 'mobx-react-lite';
import { ProvVisCreator } from '@trrack/vis-react';
import { NodeID } from '@visdesignlab/trrack';
import { Store } from '../../../Store/Store';
import { useMantineColorScheme } from '@mantine/core';

export const HistorySidebar = observer(() => {
    const store = useContext(Store);
    const containerRef = useRef<HTMLDivElement>(null);
    const { colorScheme } = useMantineColorScheme();
    const isDarkMode = colorScheme === 'dark';

    // State for bookmarked nodes, initialized from localStorage
    const [bookmarkedNodes, setBookmarkedNodes] = useState<NodeID[]>(() => {
        const saved = localStorage.getItem('trrack-bookmarks');
        return saved ? JSON.parse(saved) : [];
    });

    // Save to localStorage whenever bookmarkedNodes changes
    useEffect(() => {
        localStorage.setItem('trrack-bookmarks', JSON.stringify(bookmarkedNodes));
    }, [bookmarkedNodes]);

    // We need to track if the graph has been initialized to avoid double initialization
    const initializedRef = useRef(false);

    // Re-render when graph version changes
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _version = store.provenanceStore.graphVersion;

    const bookmarkNodeCallback = (nodeId: NodeID) => {
        setBookmarkedNodes((prev) => {
            if (prev.includes(nodeId)) {
                return prev.filter((id) => id !== nodeId);
            }
            return [...prev, nodeId];
        });
    };

    const isBookmarkedCallback = (id: NodeID) => {
        return bookmarkedNodes.includes(id);
    };

    useEffect(() => {
        if (containerRef.current) {
            // Clear previous content
            containerRef.current.innerHTML = '';

            // console.log("Provenance: ", store.provenanceStore.provenance);
            // console.log("isBookmarkedCallback: ", isBookmarkedCallback);
            // console.log("bookmarkNodeCallback: ", bookmarkNodeCallback);
            // console.log("containerRef.current: ", containerRef.current);
            // console.log("isDarkMode: ", isDarkMode);
            // ProvVisCreator(
            //     containerRef.current,
            //     store.provenanceStore.provenance as any,
            //     {
            //         isBookmarked: isBookmarkedCallback,
            //         bookmarkNode: bookmarkNodeCallback,
            //         isDarkMode,
            //     },
            //     true,
            // );
            initializedRef.current = true;
        }
        const test = false;
        if (test) {
            throw new Error('Test error');
        }
    }, [store.provenanceStore.provenance, isDarkMode, _version, bookmarkedNodes]);

    return (
        <div
            ref={containerRef}
            style={{
                height: '100%',
                width: '100%',
                overflow: 'hidden', // Let trrack-vis handle scrolling if needed, or set to auto
            }}
        />
    );
});
