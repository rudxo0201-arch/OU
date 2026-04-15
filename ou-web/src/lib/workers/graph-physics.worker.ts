import * as d3 from 'd3-force';

interface PhysicsNode extends d3.SimulationNodeDatum {
  id: string;
  importance?: number;
}

interface PhysicsLink extends d3.SimulationLinkDatum<PhysicsNode> {
  source: string;
  target: string;
  weight?: number;
}

let simulation: d3.Simulation<PhysicsNode, PhysicsLink> | null = null;
let nodes: PhysicsNode[] = [];
let links: PhysicsLink[] = [];

self.onmessage = (e: MessageEvent) => {
  const { type, data } = e.data;

  if (type === 'INIT') {
    nodes = data.nodes.map((n: PhysicsNode) => ({ ...n }));
    links = data.links ?? [];

    simulation = d3.forceSimulation<PhysicsNode, PhysicsLink>(nodes)
      .force('link', d3.forceLink<PhysicsNode, PhysicsLink>(links)
        .id(d => d.id)
        .distance(80)
        .strength(0.3)
      )
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide<PhysicsNode>().radius(d => 8 + (d.importance ?? 1) * 2))
      .alphaDecay(0.02)
      .on('tick', () => {
        self.postMessage({
          type: 'TICK',
          nodes: nodes.map(n => ({ id: n.id, x: n.x ?? 0, y: n.y ?? 0 })),
        });
      })
      .on('end', () => {
        self.postMessage({ type: 'STABLE' });
      });
  }

  if (type === 'ADD_NODES') {
    const newNodes: PhysicsNode[] = data.nodes.map((n: PhysicsNode) => ({
      ...n,
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200,
    }));
    nodes = [...nodes, ...newNodes];
    simulation?.nodes(nodes).alpha(0.3).restart();
  }

  if (type === 'STOP') {
    simulation?.stop();
  }
};
