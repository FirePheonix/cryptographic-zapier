"use client";

import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  type Edge,
  getOutgoers,
  type IsValidConnection,
  type Node,
  type OnConnect,
  type OnConnectEnd,
  type OnConnectStart,
  type OnEdgesChange,
  type OnNodesChange,
  ReactFlow,
  type ReactFlowProps,
  useReactFlow,
} from "@xyflow/react";
import { BoxSelectIcon, PlusIcon } from "lucide-react";
import { nanoid } from "nanoid";
import type { MouseEvent, MouseEventHandler } from "react";
import { useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useDebouncedCallback } from "use-debounce";
import { saveWorkspaceVersion } from "@/app/actions/workspace";
import { useAnalytics } from "@/hooks/use-analytics";
import { useSaveProject } from "@/hooks/use-save-project";
import { handleError } from "@/lib/error/handle";
import { NodeDropzoneProvider } from "@/providers/node-dropzone";
import { NodeOperationsProvider } from "@/providers/node-operations";
import { useNodeOutputs } from "@/providers/node-outputs";
import { useOrgWorkflow } from "@/providers/org-workflow";
import { ConnectionLine } from "./connection-line";
import { edgeTypes } from "./edges";
import { nodeTypes } from "./nodes";
import { NodeOutputPanel } from "./node-output-panel";
import { NodeSidebar } from "./node-sidebar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./ui/context-menu";

export const OrgCanvas = ({ children, ...props }: ReactFlowProps) => {
  const { workspace } = useOrgWorkflow();
  const { outputs } = useNodeOutputs();
  const {
    onConnect,
    onEdgesChange,
    onNodesChange,
    nodes: initialNodes,
    edges: initialEdges,
    ...restProps
  } = props ?? {};
  const content = workspace?.content as { nodes: Node[]; edges: Edge[] } | null;
  const [nodes, setNodes] = useState<Node[]>(
    initialNodes ?? content?.nodes ?? []
  );
  const [edges, setEdges] = useState<Edge[]>(
    initialEdges ?? content?.edges ?? []
  );
  const [copiedNodes, setCopiedNodes] = useState<Node[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPosition, setSidebarPosition] = useState<{ x: number; y: number } | undefined>(undefined);
  const {
    getEdges,
    toObject,
    screenToFlowPosition,
    getNodes,
    getNode,
    updateNode,
  } = useReactFlow();
  const analytics = useAnalytics();
  const [saveState, setSaveState] = useSaveProject();

  const save = useDebouncedCallback(async () => {
    if (saveState.isSaving || !workspace?.id) {
      return;
    }

    try {
      setSaveState((prev) => ({ ...prev, isSaving: true }));

      const flowObject = toObject();
      
      // Transform nodes to match our schema type
      const content = {
        nodes: flowObject.nodes.map((node) => ({
          id: node.id,
          type: node.type || "unknown",
          position: node.position,
          data: node.data as Record<string, unknown>,
        })),
        edges: flowObject.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
        })),
      };

      const response = await saveWorkspaceVersion(
        workspace.id,
        content,
        `Auto-save v${workspace.currentVersion + 1}`
      );

      if (!response.success) {
        throw new Error(response.error);
      }

      setSaveState((prev) => ({ ...prev, lastSaved: new Date() }));
    } catch (error) {
      handleError("Error saving workspace", error);
    } finally {
      setSaveState((prev) => ({ ...prev, isSaving: false }));
    }
  }, 1000);

  const handleNodesChange = useCallback<OnNodesChange>(
    (changes) => {
      setNodes((current) => {
        const updated = applyNodeChanges(changes, current);
        save();
        onNodesChange?.(changes);
        return updated;
      });
    },
    [save, onNodesChange]
  );

  const handleEdgesChange = useCallback<OnEdgesChange>(
    (changes) => {
      setEdges((current) => {
        const updated = applyEdgeChanges(changes, current);
        save();
        onEdgesChange?.(changes);
        return updated;
      });
    },
    [save, onEdgesChange]
  );

  const handleConnect = useCallback<OnConnect>(
    (connection) => {
      const newEdge: Edge = {
        id: nanoid(),
        type: "animated",
        ...connection,
      };
      setEdges((eds: Edge[]) => eds.concat(newEdge));
      save();
      onConnect?.(connection);
    },
    [save, onConnect]
  );

  const addNode = useCallback(
    (type: string, options?: Record<string, unknown>) => {
      const { data: nodeData, ...nodeOptions } = options ?? {};
      const newNode: Node = {
        id: nanoid(),
        type,
        data: {
          ...(nodeData ? nodeData : {}),
        },
        position: { x: 0, y: 0 },
        origin: [0, 0.5],
        ...nodeOptions,
      };

      setNodes((nds: Node[]) => nds.concat(newNode));
      save();

      analytics.track("toolbar", "node", "added", {
        type,
      });

      return newNode.id;
    },
    [save, analytics]
  );

  const duplicateNode = useCallback(
    (id: string) => {
      const node = getNode(id);

      if (!node?.type) {
        return;
      }

      const { id: _oldId, ...nodeProps } = node;

      const newId = addNode(node.type, {
        ...nodeProps,
        position: {
          x: node.position.x + 200,
          y: node.position.y + 200,
        },
        selected: true,
      });

      setTimeout(() => {
        updateNode(id, { selected: false });
        updateNode(newId, { selected: true });
      }, 0);
    },
    [addNode, getNode, updateNode]
  );

  const handleConnectEnd = useCallback<OnConnectEnd>(
    (event, connectionState) => {
      if (!connectionState.isValid) {
        const { clientX, clientY } =
          "changedTouches" in event ? event.changedTouches[0] : event;

        const sourceId = connectionState.fromNode?.id;
        const isSourceHandle = connectionState.fromHandle?.type === "source";

        if (!sourceId) {
          return;
        }

        const newNodeId = addNode("drop", {
          position: screenToFlowPosition({ x: clientX, y: clientY }),
          data: {
            isSource: !isSourceHandle,
          },
        });

        setEdges((eds: Edge[]) =>
          eds.concat({
            id: nanoid(),
            source: isSourceHandle ? sourceId : newNodeId,
            target: isSourceHandle ? newNodeId : sourceId,
            type: "temporary",
          })
        );
      }
    },
    [addNode, screenToFlowPosition]
  );

  const isValidConnection = useCallback<IsValidConnection>(
    (connection) => {
      const currentNodes = getNodes();
      const currentEdges = getEdges();
      const target = currentNodes.find((node) => node.id === connection.target);
      const source = currentNodes.find((node) => node.id === connection.source);

      if (!source || !target) {
        return false;
      }

      if (target.id === connection.source) {
        return false;
      }

      if (source.type === "drop" || target.type === "drop") {
        return true;
      }

      const hasCycle = (node: Node, visited = new Set<string>()) => {
        if (visited.has(node.id)) {
          return false;
        }

        visited.add(node.id);

        for (const outgoer of getOutgoers(node, currentNodes, currentEdges)) {
          if (outgoer.id === connection.source || hasCycle(outgoer, visited)) {
            return true;
          }
        }

        return false;
      };

      return !hasCycle(target);
    },
    [getNodes, getEdges]
  );

  const handleConnectStart = useCallback<OnConnectStart>(() => {
    setNodes((nds: Node[]) => nds.filter((n: Node) => n.type !== "drop"));
    setEdges((eds: Edge[]) => eds.filter((e: Edge) => e.type !== "temporary"));
    save();
  }, [save]);

  const addDropNode = useCallback<MouseEventHandler<HTMLDivElement>>(
    (event) => {
      if (!(event.target instanceof HTMLElement)) {
        return;
      }

      if (
        !event.target.classList.contains("react-flow__pane") &&
        !event.target.closest(".react-flow__pane")
      ) {
        return;
      }

      const { x, y } = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode("drop", {
        position: { x, y },
      });
    },
    [addNode, screenToFlowPosition]
  );

  const handleSelectAll = useCallback(() => {
    setNodes((nds: Node[]) =>
      nds.map((node: Node) => ({ ...node, selected: true }))
    );
  }, []);

  const handleCopy = useCallback(() => {
    const selectedNodes = getNodes().filter((node) => node.selected);
    if (selectedNodes.length > 0) {
      setCopiedNodes(selectedNodes);
    }
  }, [getNodes]);

  const handlePaste = useCallback(() => {
    if (copiedNodes.length === 0) {
      return;
    }

    const newNodes = copiedNodes.map((node) => ({
      ...node,
      id: nanoid(),
      position: {
        x: node.position.x + 200,
        y: node.position.y + 200,
      },
      selected: true,
    }));

    setNodes((nds: Node[]) =>
      nds.map((node: Node) => ({
        ...node,
        selected: false,
      }))
    );

    setNodes((nds: Node[]) => [...nds, ...newNodes]);
  }, [copiedNodes]);

  const handleDuplicateAll = useCallback(() => {
    const selected = getNodes().filter((node) => node.selected);

    for (const node of selected) {
      duplicateNode(node.id);
    }
  }, [getNodes, duplicateNode]);

  const handleContextMenu = useCallback((event: MouseEvent) => {
    if (
      !(
        event.target instanceof HTMLElement &&
        event.target.classList.contains("react-flow__pane")
      )
    ) {
      event.preventDefault();
    }
  }, []);

  useHotkeys("meta+a", handleSelectAll, {
    enableOnContentEditable: false,
    preventDefault: true,
  });

  useHotkeys("meta+d", handleDuplicateAll, {
    enableOnContentEditable: false,
    preventDefault: true,
  });

  useHotkeys("meta+c", handleCopy, {
    enableOnContentEditable: false,
    preventDefault: true,
  });

  useHotkeys("meta+v", handlePaste, {
    enableOnContentEditable: false,
    preventDefault: true,
  });

  return (
    <NodeOperationsProvider addNode={addNode} duplicateNode={duplicateNode}>
      <NodeDropzoneProvider>
        <ContextMenu>
          <ContextMenuTrigger onContextMenu={handleContextMenu}>
            <ReactFlow
              connectionLineComponent={ConnectionLine}
              deleteKeyCode={["Backspace", "Delete"]}
              edges={edges}
              edgeTypes={edgeTypes}
              fitView
              isValidConnection={isValidConnection}
              nodes={nodes}
              nodeTypes={nodeTypes}
              onConnect={handleConnect}
              onConnectEnd={handleConnectEnd}
              onConnectStart={handleConnectStart}
              onDoubleClick={addDropNode}
              onEdgesChange={handleEdgesChange}
              onNodesChange={handleNodesChange}
              panOnDrag={false}
              panOnScroll
              selectionOnDrag={true}
              zoomOnDoubleClick={false}
              {...restProps}
            >
              <Background />
              <NodeOutputPanel outputs={outputs} />
              {children}
            </ReactFlow>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={(e) => {
              const rect = (e.target as HTMLElement).getBoundingClientRect();
              setSidebarPosition({ x: rect.x, y: rect.y });
              setSidebarOpen(true);
            }}>
              <PlusIcon size={12} />
              <span>Add a new node</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={handleSelectAll}>
              <BoxSelectIcon size={12} />
              <span>Select all</span>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        <NodeSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          position={sidebarPosition}
        />
      </NodeDropzoneProvider>
    </NodeOperationsProvider>
  );
};


