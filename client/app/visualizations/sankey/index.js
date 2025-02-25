import angular from 'angular';
import _ from 'lodash';
import d3 from 'd3';
import { angular2react } from 'angular2react';
import { registerVisualization } from '@/visualizations';

import d3sankey from '@/lib/visualizations/d3sankey';

import Editor from './Editor';

function getConnectedNodes(node) {
  // source link = this node is the source, I need the targets
  const nodes = [];
  node.sourceLinks.forEach((link) => {
    nodes.push(link.target);
  });
  node.targetLinks.forEach((link) => {
    nodes.push(link.source);
  });

  return nodes;
}

function graph(data) {
  const nodesDict = {};
  const links = {};
  const nodes = [];

  // ANGULAR_REMOVE_ME $$ check is for Angular's internal properties
  const validKey = key => key !== 'value' && key.indexOf('$$') !== 0;
  const keys = _.sortBy(_.filter(_.keys(data[0]), validKey), _.identity);

  function normalizeName(name) {
    if (!_.isNil(name)) {
      return '' + name;
    }

    return 'Exit';
  }

  function getNode(name, level) {
    name = normalizeName(name);
    const key = `${name}:${String(level)}`;
    let node = nodesDict[key];
    if (!node) {
      node = { name };
      node.id = nodes.push(node) - 1;
      nodesDict[key] = node;
    }
    return node;
  }

  function getLink(source, target) {
    let link = links[[source, target]];
    if (!link) {
      link = { target, source, value: 0 };
      links[[source, target]] = link;
    }

    return link;
  }

  function addLink(sourceName, targetName, value, depth) {
    if ((sourceName === '' || !sourceName) && depth > 1) {
      return;
    }

    const source = getNode(sourceName, depth);
    const target = getNode(targetName, depth + 1);
    const link = getLink(source.id, target.id);
    link.value += parseInt(value, 10);
    link.color = 'rgba( 47, 109, 182, 0.2)';
  }

  data.forEach((row) => {
    addLink(row[keys[0]], row[keys[1]], row.value || 0, 1);
    addLink(row[keys[1]], row[keys[2]], row.value || 0, 2);
    addLink(row[keys[2]], row[keys[3]], row.value || 0, 3);
    addLink(row[keys[3]], row[keys[4]], row.value || 0, 4);
  });
  return { nodes, links: _.values(links) };
}

function spreadNodes(height, data) {
  const nodesByBreadth = d3
    .nest()
    .key(d => d.x)
    .entries(data.nodes)
    .map(d => d.values);

  nodesByBreadth.forEach((nodes) => {
    nodes = _.filter(_.sortBy(nodes, node => -node.value), node => node.name !== 'Exit');

    const sum = d3.sum(nodes, o => o.dy);
    const padding = (height - sum) / nodes.length;

    _.reduce(
      nodes,
      (y0, node) => {
        node.y = y0;
        return y0 + node.dy + padding;
      },
      0,
    );
  });
}

function createSankey(element, data) {
  const margin = {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10,
  };
  const width = element.offsetWidth - margin.left - margin.right;
  const height = element.offsetHeight - margin.top - margin.bottom;

  if (width <= 0 || height <= 0) {
    return;
  }

  const format = d => d3.format(',.0f')(d);
  // const color = d3.scale.category20();//修改 桑基图颜色
  const color = ['#02A4CE', '#4596D8', '#418ECE', '#66CBF6', '#BCE3F8', '#DE3B84', '#1B2668', '#113A91', '#624EC2', '#0834CB', '#336DFF', '#87ADFF', '#FF7538', '#1A75BB', '#2F979C', '#BCE3F8', '#614DBF', '#F39521', '#418ECE', '#FBA88A'];

  data = graph(data);
  // data.nodes = _.map(data.nodes, d => _.extend(d, { color: color(d.name.replace(/ .*/, '')) })); //修改 桑基图颜色
  data.nodes = _.map(data.nodes, (d, index) => _.extend(d, { color: color[index % 20] }));

  // append the svg canvas to the page
  const svg = d3
    .select(element)
    .append('svg')
    .attr('class', 'sankey')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Set the sankey diagram properties
  const sankey = d3sankey()
    .nodeWidth(15)
    .nodePadding(10)
    .size([width, height]);

  const path = sankey.link();

  sankey
    .nodes(data.nodes)
    .links(data.links)
    .layout(0);

  spreadNodes(height, data);
  sankey.relayout();

  // add in the links
  const link = svg
    .append('g')
    .selectAll('.link')
    .data(data.links)
    .enter()
    .append('path')
    .filter(l => l.target.name !== 'Exit')
    .attr('class', 'link')
    .attr('d', path)
    .style('stroke-width', d => Math.max(1, d.dy))
    .sort((a, b) => b.dy - a.dy);

  // add the link titles
  link.append('title').text(d => `${d.source.name} → ${d.target.name}\n${format(d.value)}`);

  const node = svg
    .append('g')
    .selectAll('.node')
    .data(data.nodes)
    .enter()
    .append('g')
    .filter(n => n.name !== 'Exit')
    .attr('class', 'node')
    .attr('transform', d => `translate(${d.x},${d.y})`);

  function nodeMouseOver(currentNode) {
    let nodes = getConnectedNodes(currentNode);
    nodes = _.map(nodes, i => i.id);
    node
      .filter((d) => {
        if (d === currentNode) {
          return false;
        }
        return !_.includes(nodes, d.id);
      })
      .style('opacity', 0.2);
    link
      .filter(l => !(_.includes(currentNode.sourceLinks, l) || _.includes(currentNode.targetLinks, l)))
      .style('opacity', 0.2);
  }

  function nodeMouseOut() {
    node.style('opacity', 1);
    link.style('opacity', 1);
  }

  // add in the nodes
  node.on('mouseover', nodeMouseOver).on('mouseout', nodeMouseOut);

  // add the rectangles for the nodes
  node
    .append('rect')
    .attr('height', d => d.dy)
    .attr('width', sankey.nodeWidth())
    .style('fill', d => d.color)
    .style('stroke', d => d3.rgb(d.color).darker(2))
    .append('title')
    .text(d => `${d.name}\n${format(d.value)}`);

  // add in the title for the nodes
  node
    .append('text')
    .attr('x', -6)
    .attr('y', d => d.dy / 2)
    .attr('dy', '.35em')
    .attr('text-anchor', 'end')
    .attr('transform', null)
    .text(d => d.name)
    .filter(d => d.x < width / 2)
    .attr('x', 6 + sankey.nodeWidth())
    .attr('text-anchor', 'start');
}

function isDataValid(data) {
  // data should contain column named 'value', otherwise no reason to render anything at all
  return _.find(data.columns, c => c.name === 'value');
}

const SankeyRenderer = {
  template: '<div class="sankey-visualization-container" resize-event="handleResize()"></div>',
  bindings: {
    data: '<',
    options: '<',
  },
  controller($scope, $element) {
    const container = $element[0].querySelector('.sankey-visualization-container');

    const update = () => {
      if (this.data) {
        // do the render logic.
        angular.element(container).empty();
        if (isDataValid(this.data)) {
          createSankey(container, this.data.rows);
        }
      }
    };

    $scope.handleResize = _.debounce(update, 50);

    $scope.$watch('$ctrl.data', update);
    $scope.$watch('$ctrl.options', update, true);
  },
};

export default function init(ngModule) {
  ngModule.component('sankeyRenderer', SankeyRenderer);

  ngModule.run(($injector) => {
    registerVisualization({
      type: 'SANKEY',
      name: 'Sankey',
      getOptions: options => ({ ...options }),
      Renderer: angular2react('sankeyRenderer', SankeyRenderer, $injector),
      Editor,

      defaultRows: 7,
    });
  });
}

init.init = true;
