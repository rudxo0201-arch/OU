import * as d3 from 'd3-force';

interface PhysicsNode extends d3.SimulationNodeDatum {
  id: string;
  importance?: number;
  degree?: number;
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
        .distance(data.linkDistance ?? 80)
        .strength(data.linkForce ?? 0.3)
      )
      .force('charge', d3.forceManyBody().strength(-(data.repelForce ?? 120)))
      .force('center', d3.forceCenter(0, 0).strength(data.centerForce ?? 0.05))
      .force('collision', d3.forceCollide<PhysicsNode>().radius(d =>
        5 + (d.degree ?? 1) * 0.5
      ))
      .alphaDecay(0.01)
      .velocityDecay(0.4)
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

  if (type === 'UPDATE_FORCES') {
    if (!simulation) return;

    if (data.centerForce !== undefined) {
      (simulation.force('center') as d3.ForceCenter<PhysicsNode>)?.strength(data.centerForce);
    }
    if (data.repelForce !== undefined) {
      simulation.force('charge', d3.forceManyBody().strength(-data.repelForce));
    }
    if (data.linkForce !== undefined) {
      const linkF = simulation.force('link') as d3.ForceLink<PhysicsNode, PhysicsLink>;
      if (linkF) linkF.strength(data.linkForce);
    }
    if (data.linkDistance !== undefined) {
      const linkF = simulation.force('link') as d3.ForceLink<PhysicsNode, PhysicsLink>;
      if (linkF) linkF.distance(data.linkDistance);
    }

    simulation.alpha(0.3).restart();
  }

  if (type === 'DRAG_START') {
    const node = nodes.find(n => n.id === data.id);
    if (node) {
      node.fx = node.x;
      node.fy = node.y;
    }
    simulation?.alphaTarget(0.3).restart();
  }

  if (type === 'DRAG_MOVE') {
    const node = nodes.find(n => n.id === data.id);
    if (node) {
      node.fx = data.x;
      node.fy = data.y;
    }
  }

  if (type === 'DRAG_END') {
    const node = nodes.find(n => n.id === data.id);
    if (node) {
      node.fx = null;
      node.fy = null;
    }
    simulation?.alphaTarget(0);
  }

  if (type === 'REHEAT') {
    simulation?.alpha(data.alpha ?? 0.5).restart();
  }

  if (type === 'STOP') {
    simulation?.stop();
  }
};
