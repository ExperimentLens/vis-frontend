import { useEffect, useRef, useState } from 'react';
import { useAppDispatch } from '../../../store/store';
import type {
  Node,
  Edge } from '@xyflow/react';
import {
  ReactFlow,
  Controls,
  Background,
  useReactFlow,
  ReactFlowProvider,
  Position
} from '@xyflow/react';
import { useTheme } from '@mui/material/styles';

import '@xyflow/react/dist/style.css';
import type { ITask } from '../../../shared/models/experiment/task.model';
import { Tooltip } from '@mui/material';
import type { IParam } from '../../../shared/models/experiment/param.model';
import { setSelectedId, setSelectedTask } from '../../../store/slices/workflowPageSlice';

interface IFlowGraphProps {
  workflowSvg: { tasks: ITask[] | undefined; start: number | undefined; end: number | undefined } | null
  params: IParam[] | undefined | null
  onClose?: () => void
}

function FlowGraph(props: IFlowGraphProps) {
  const { workflowSvg, params, onClose } = props;
  const flowWrapper = useRef(null);
  const { fitView } = useReactFlow();
  const dispatch = useAppDispatch();
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const theme = useTheme();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const startEndNodeStyle = {
    borderRadius: '100%',
    backgroundColor: theme.palette.background.paper,
    width: 50,
    height: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none' as const,
    cursor: 'default',
  };

  const clickableNodeStyle = {
    cursor: 'default',
    border: `1px solid ${theme.palette.primary.main}`,
    backgroundColor: theme.palette.background.paper,
  };

  const disabledNodeStyle = {
    cursor: 'default',
    border: `1px solid ${theme.palette.customGrey.dark}`,
    color: `${theme.palette.customGrey.dark}`,
    backgroundColor: theme.palette.background.paper,
  };

  const interactiveNodeStyle = {
    cursor: 'pointer',
    border: `1px solid ${theme.palette.warning.main}`,
    backgroundColor: theme.palette.background.paper,
  };

  const onNodeClick = (_event: React.MouseEvent, node: Node) => {
    // Only dispatch if the node is selectable and is not a start/end node
    if (node.id === 'start' || node.id === 'end') {
      return;
    }

    const task = workflowSvg?.tasks?.find(t => t.name === node.id);
    if (!task) return;

    const isSelectable = getNodeSelectState(task);
    if (!isSelectable) return;

    // Dispatch same actions as WorkflowTree does when clicking a task
    dispatch(setSelectedId(`task-${task.id}`));
    dispatch(setSelectedTask({
      role: 'TASK',
      task: task.name,
      taskId: task.id,
      variant: task.variant,
    }));

    // Close the dialog
    if (onClose) {
      onClose();
    }
  };

  const getNodeSelectState = (task: ITask) => {
    // Enable selection for clickable tasks, disable for locked/blocked tasks
    if (!workflowSvg?.start || !workflowSvg?.end) {
      const interactiveTask = workflowSvg?.tasks?.find(
        t => t.type === 'interactive',
      );

      if (interactiveTask && !interactiveTask.endTime) {
        return task.type === 'interactive';
      } else if (interactiveTask && interactiveTask.endTime) {
        return task.type === 'read_data' || task.type === 'evaluation';
      }
      return false;
    }
    // When workflow is completed, all non-special tasks are selectable
    return task.type !== 'interactive' && task.type !== 'custom' && task.type !== 'explainability';
  };

  const getInitialNodeStyle = (
    taskType: string,
    tasks: ITask[] | undefined,
    workflowStart: number | undefined,
    workflowEnd: number | undefined,
  ) => {
    if (workflowStart && workflowEnd) {
      switch (taskType) {
        case 'interactive':
          return disabledNodeStyle;
        case 'custom':
          return disabledNodeStyle;
        case 'explainability':
          return disabledNodeStyle;
        default:
          return clickableNodeStyle;
      }
    } else {
      const interactiveTask = tasks?.find(
        t => t.type === 'interactive',
      );

      if (interactiveTask && !interactiveTask.endTime) {
        switch (taskType) {
          case 'interactive':
            return interactiveNodeStyle;
          default:
            return disabledNodeStyle;
        }
      } else if (interactiveTask && interactiveTask.endTime) {
        switch (taskType) {
          case 'read_data':
            return clickableNodeStyle;
          case 'evaluation':
            return clickableNodeStyle;
          default:
            return disabledNodeStyle;
        }
      } else {
        return disabledNodeStyle;
      }
    }
  };

  useEffect(() => {
    // Resize functionality
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;

      setContainerSize({ width, height });
    });

    if (flowWrapper.current) {
      observer.observe(flowWrapper.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (containerSize.width > 0 && containerSize.height > 0 && nodes.length > 0) {
      setTimeout(() => {
        fitView({
          padding: 0.2,
          includeHiddenNodes: true,
          minZoom: 0.5,
          maxZoom: 1.5,
        });
      }, 50);
    }
  }, [containerSize, nodes, fitView]);

  useEffect(() => {
    if (workflowSvg && Array.isArray(workflowSvg.tasks) && workflowSvg.tasks.length > 0) {
      // Nodes and Edges initialization
      const taskNodes = workflowSvg?.tasks?.map((task, index) => {
        const matchingParams = params?.filter(param => param.task === task.id) || [];
        const paramNames = matchingParams.map(p => p.name).join(', ');

        return {
          id: task.name,
          position: { x: (index + 1) * 200, y: 100 },
          data: {
            label: matchingParams.length > 0 ? (
              <Tooltip title={`Parameters: ${paramNames}`} arrow>
                <div>{task.variant ? task.variant : task.name}</div>
              </Tooltip>
            ) : (
              <div>{task.name}</div>
            ),
            type: task.type,
            variant: task.variant,
            start: task?.startTime,
            end: task?.endTime,
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          selectable: getNodeSelectState(task),
          style: {
            ...getInitialNodeStyle(
              task.type || '',
              workflowSvg.tasks,
              workflowSvg.start,
              workflowSvg.end,
            ),
            cursor: getNodeSelectState(task) ? 'pointer' : 'default'
          },
        };
      });

      const startNode = {
        id: 'start',
        position: { x: 100, y: 94 },
        sourcePosition: Position.Right,
        targetPosition: Position.Right,
        data: { label: 'Start' },
        selectable: false,
        style: startEndNodeStyle,
      };

      const endNode = {
        id: 'end',
        position: { x: workflowSvg?.tasks?.length * 200 + 200, y: 94 },
        targetPosition: Position.Left,
        sourcePosition: Position.Left,
        data: { label: 'End' },
        selectable: false,
        style: startEndNodeStyle,
      };

      const tasks = workflowSvg?.tasks;

      const taskEdges =
        tasks && tasks.length > 1
          ? tasks.flatMap((task, idx) =>
            idx <= tasks.length - 2
              ? [
                {
                  id: `${task.name}-${tasks[idx + 1].name}`,
                  source: task.name,
                  target: tasks[idx + 1].name,
                  animated: true,
                  selectable: false,
                  reconnectable: false,
                },
              ]
              : [],
          )
          : [];

      // After setting nodes and edges, add a timeout to allow rendering before fitting view
      setNodes([startNode, ...taskNodes, endNode]);
      setEdges([
        {
          id: `start-${workflowSvg?.tasks[0].name}`,
          source: 'start',
          target: workflowSvg?.tasks[0].name || '',
          animated: true,
        },
        ...taskEdges,
        {
          id: `${workflowSvg.tasks[workflowSvg?.tasks.length - 1].name}-end`,
          source: workflowSvg.tasks[workflowSvg?.tasks.length - 1].name || '',
          target: 'end',
          animated: true,
        },
      ]);

      // Add a small delay to ensure nodes are rendered before attempting to fit view
      setTimeout(() => {
        fitView({
          padding: 0.2,
          includeHiddenNodes: true,
          minZoom: 0.5,
          maxZoom: 1.5,
        });
      }, 50);
    }
  }, [workflowSvg, fitView]);

  return (
    <div
      style={{
        height: '15vh',
        width: '100%',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '8px',
      }}
      ref={flowWrapper}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        panOnDrag={true}
        zoomOnScroll={true}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        onNodeClick={onNodeClick}
        zoomOnPinch={false}
        proOptions={{ hideAttribution: true }}
        fitView={true}
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: true,
          minZoom: 0.5,
          maxZoom: 1.5,
        }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

function StaticDirectedGraph(props: IFlowGraphProps) {
  const { workflowSvg, params, onClose } = props;

  return (
    <ReactFlowProvider>
      <FlowGraph
        workflowSvg={workflowSvg}
        params={params}
        onClose={onClose}
      />
    </ReactFlowProvider>
  );
}

export default StaticDirectedGraph;
