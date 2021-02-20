import React from 'react';
import { useSteps } from 'mdx-deck';
import createGraph from 'ngraph.graph';
import createLayout from 'ngraph.forcelayout';
import './animation.css';
import { smoothHull } from './smoothHull.js';
import { polygonHull } from 'd3-polygon';
import generate from './maze.js';

// https://stackoverflow.com/a/63179941
class ObjectSet extends Set {
    add(elem) {
        return super.add(typeof elem === 'object' ? JSON.stringify(elem) : elem);
    }
    has(elem) {
        return super.has(typeof elem === 'object' ? JSON.stringify(elem) : elem);
    }
}

export function makeGraph(links, roots=[], speed=0.25) {
    let g = createGraph();
    let layout = createLayout(g, {springLength: 20});
    let shadowLinks = [];

    function doSteps(n) {
        for (let i = 0; i < n; i++) {
            layout.step();
            let rootY = Infinity;
            for (const root of roots) {
                if (!g.hasNode(root)) continue;
                rootY = Math.min(rootY, layout.getNodePosition(root).y);
            }

            for (const root of roots) {
                if (!g.hasNode(root)) continue;
                const {x} = layout.getNodePosition(root);
                layout.setNodePosition(root, x, rootY - speed);
            }
        }
    }

    for (const link of links) {
        const v = g.addLink(link[0], link[1]);
        const options = Array.isArray(link[2]) ? link[2] : [link[2]];
        if (options.includes('shadow')) {
            shadowLinks.push(v);
        }

        if (options.includes('long')) {
            const spring = layout.getSpring(link[0], link[1]);
            spring.length = 30;
        }

        doSteps(500);
    }

    doSteps(3000);

    for (const link of shadowLinks) {
        g.removeLink(link);
    }

    return [g, layout];
}

export function makeMaze(w, h) {
    const maze = generate({ width: w, height: h });
    console.log(maze);
    let g = createGraph();
    let layout = createLayout(g);
    for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) {
            if (i && maze[j][i] === 0 && maze[j][i - 1] === 0) {
                g.addLink(i * h + j, (i - 1) * h + j);
            }

            if (j && maze[j][i] === 0 && maze[j - 1][i] === 0) {
                g.addLink(i * h + j, i * h + j - 1);
            }

        }
    }
    g.addNode('shadow1');
    g.addNode('shadow2');
    g.addNode('shadow3');
    layout.setNodePosition('shadow1', -15, -15);
    layout.setNodePosition('shadow2', -15, 0);
    layout.setNodePosition('shadow3', 15*w, 15*h);
    for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) {
            if (g.hasNode(i*h + j))
                layout.setNodePosition(i*h + j, 15*i, 15*j);
        }
    }
    return [g, layout, getNodePosition => {
        const {x: x1, y: y1} = getNodePosition('shadow1');
        const {x: x2, y: y2} = getNodePosition('shadow2');
        const d = Math.hypot(x1 - x2, y1 - y2);
        const [x0, y0] = [x1 + d/2, y1 + d/2];
        let grid = [];
        for (let i = 0; i < w; i++) {
            for (let j = 0; j < h; j++) {
                grid.push(<rect x={d*i + x0} y={d*j + y0} width={d} height={d}
                    fill={maze[j][i] ? 'gray' : 'none'} stroke="gray" />);
            }
        }
        return grid;
    }];
}

export function animateLayers(g, start, color, target, targetColor) {
    let steps = [];
    let nextQueue = [start];
    let visited = new Set();
    visited.add(start);
    while (nextQueue.length && !visited.has(target)) {
        let currentQueue = nextQueue;
        let currentStep = [];
        nextQueue = [];
        while (currentQueue.length) {
            const node = currentQueue.pop();
            g.forEachLinkedNode(node, (a, L) => {
                a = a.id;
                if (!visited.has(a)) {
                    visited.add(a);
                    nextQueue.push(a);
                    currentStep.push([a === target ? targetColor : color, a]);
                }

                if (!visited.has([node, a]) && !visited.has([a, node])) {
                    visited.add([node, a]);
                    currentStep.push([color, node, a]);
                }
            });
        }
        if (currentStep.length)
            steps.push(currentStep);
    }
    return steps;
}

export function highlightSubtree(g, parent, root, color) {
    let output = [[color, root], [color, root, parent, 'arrow']];
    let queue = [root];
    while (queue.length) {
        let a = queue.pop();
        g.forEachLinkedNode(a, (b, L) => {
            if (a !== L.toId) return;
            b = b.id;
            queue.push(b);
            output.push([color, b]);
            output.push([color, b, a, 'arrow']);
        });
    }
    return output;
}

export function hideAllEdges(g) {
    let result = [];
    g.forEachLink(link => {
        result.push(['hide', link.fromId, link.toId]);
    });

    return result;
}

class Graph extends React.Component {
    render() {
        const color = this.props.color || "white";
        const layout = this.props.layout;

        const scale = 5;
        let {min_x, min_y, max_x, max_y} = layout.getGraphRect();
        min_x *= scale;
        min_y *= scale;
        max_x *= scale;
        max_y *= scale;
        const radius = this.props.noNames ? 10 : 20;
        const border = 40;
        const dx = -min_x + radius + border;
        const dy = -min_y + radius + border + 10;
        const width = max_x - min_x + 2*(radius + border);
        const height = max_y - min_y + 2*(radius + border);

        function getNodePosition(id) {
            const {x, y} = layout.getNodePosition(id);
            return {x: x * scale + dx, y: y * scale + dy};
        }

        function getLinkPosition(a, b) {
            const {x: x1, y: y1} = getNodePosition(a);
            const {x: x2, y: y2} = getNodePosition(b);
            const length = Math.hypot(x2 - x1, y2 - y1);
            const dirx = (x2 - x1) / length * (radius + 7);
            const diry = (y2 - y1) / length * (radius + 7);
            return {x1: x1 + dirx, y1: y1 + diry,
                    x2: x2 - dirx, y2: y2 - diry};
        }

        let hidden = new ObjectSet();
        for (const highlight of this.props.highlight) {
            if (highlight[0] === 'hide') {
                hidden.add(highlight.slice(1));
            }
        }

        let elems = [];
        this.props.graph.forEachNode(node => {
            if (hidden.has([node.id])) return;
            let {x, y} = getNodePosition(node.id);
            elems.push(<circle key={node.id} cx={x} cy={y} r={radius} />);
            if (!this.props.noNames) {
                elems.push(<text key={node.id + "-text"}
                    stroke="none" fill={color} style={{ fontSize: 25 }}
                    x={x} y={y + 2}
                    textAnchor="middle" alignmentBaseline="middle">{node.id}</text>);
            }
        });

        this.props.graph.forEachLink(link => {
            if (hidden.has([link.fromId, link.toId])) return;
            const {x1, y1, x2, y2} = getLinkPosition(link.fromId, link.toId);

            const id = link.fromId + '-' + link.toId;
            elems.push(<line key={id}
                x1={x1} y1={y1} x2={x2} y2={y2}
                className={this.props.directed ? "arrow" : ""}
            />);
        });

        for (const highlight of this.props.highlight) {
            if (highlight[0] === 'hide') continue;
            if (highlight[0] === 'convexHull') {
                const points = highlight.slice(1).map(n => {
                    const {x, y} = getNodePosition(n);
                    return [x, y];
                });
                const hull = polygonHull(points);
                const path = smoothHull(hull, 50);
                elems.push(<path d={path} key={highlight.join('-')} pathLength="9.9"
                    className="highlight"/>);
            } else if (highlight.length === 2) {
                const [color, node] = highlight;
                const {x, y} = getNodePosition(node);
                elems.push(<circle
                    pathLength="9.9"
                    key={node + "-" + color}
                    className="highlight" stroke={color}
                    cx={x} cy={y} r={radius} />);
            } else {
                const [color, a, b] = highlight;
                const cls = highlight.length > 3 ? highlight[3] : "";
                if (a === b) {
                    const {x, y} = getNodePosition(a);
                    elems.push(<path d={"M" + x + " " + y + "m-18.51-25c-58.312-29.144 105-35.953 39.389-0.21583"}
                        key={a + '-' + b + '-' + color}
                        pathLength="9.9"
                        className={"highlight " + cls} stroke={color}
                    />);
                } else {
                    const {x1, y1, x2, y2} = getLinkPosition(a, b);
                    elems.push(<line
                        key={a + '-' + b + '-' + color}
                        pathLength="9.9"
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        className={"highlight " + cls} stroke={color}
                    />);
                }
            }
        }

        let y = 30;
        const comment = this.props.comment;
        // allow <tspan>s instead
        const lines = comment.split ? comment.split("\n") : [comment];
        for (const line of lines ){
            elems.push(
                <text key={line} textAnchor="end" dominantBaseline="hanging" x={width} y={y}
                stroke="none" fill={color} style={{ fontSize: 30 }}>{line}</text>
            );
            y += 30;
        }

        for (const label of this.props.labels) {
            const [content, rel, ...anchor] = label;
            let anchorPos;
            if (anchor.length === 1) {
                anchorPos = getNodePosition(anchor[0]);
            } else {
                const { x1, y1, x2, y2 } = getLinkPosition(anchor[0], anchor[1]);
                anchorPos = {
                    x: (x1 + x2) / 2,
                    y: (y1 + y2) / 2,
                };
            }

            const [dx, dy, textAnchor, baseline] = {
                'above': [0, -1, 'middle', 'auto'],
                'right': [1, 0, 'beginning', 'middle'],
            }[rel];

            const r = anchor.length === 1 ? 30 : 10;
            const R = r + 50;
            const tr = R + 5;
            const x2 = anchorPos.x + dx * r;
            const y2 = anchorPos.y + dy * r;
            const x1 = anchorPos.x + dx * R;
            const y1 = anchorPos.y + dy * R;
            const xt = anchorPos.x + dx * tr;
            const yt = anchorPos.y + dy * tr;

            elems.push(<line
                key={label.join() + '-arrow'}
                pathLength="9.9"
                x1={x1} y1={y1} x2={x2} y2={y2}
                className="label"
            />);
            elems.push(<text
                className="label"
                key={label.join() + '-text'}
                textAnchor={textAnchor} dominantBaseline={baseline} x={xt} y={yt}
                style={{ fontSize: 20 }}>
                {content}
            </text>);
        }

        for (const weight of this.props.weights) {
            const [from, to, n] = weight;
            const { x1, y1, x2, y2 } = getLinkPosition(from, to);
            const x = (x1 + x2) / 2;
            const y = (y1 + y2) / 2;

            elems.push(<text
                className="weight"
                key={weight.join()}
                textAnchor="middle" dominantBaseline="middle" x={x} y={y}>
                {n}
            </text>);
        }

        let defs = [];
        for (const color of ["red", "orange", "black", "white", "yellow", "green", "label"]) {
            defs.push(
                <marker key={color} id={"arrowhead-" + color}
                        markerWidth="10" markerHeight="8"
                        refX="9.2" refY="5" orient="auto" stroke={color === "label" ? "#9cdcfe" : color}>
                    <polyline points="5 3, 9 5, 5 7" strokeWidth="1" />
                </marker>
            );
        }
        return <svg fill="none" stroke={color} strokeWidth="3" viewBox={"0 0 " + width + " " + height} width="100%" height="100%">
            {this.props.extraSVG ? this.props.extraSVG(getNodePosition) : []}
            <defs>
                {defs}
            </defs>
            {elems}
        </svg>;
    }
}

class StaggerredHighlights extends React.Component {
    constructor(props) {
        super(props);
        this.state = {stagesApplied: 0};
        this.timeoutID = null;
    }

    componentDidMount() {
        this.advance();
    }

    componentWillUnmount() {
        if (this.timeoutID) {
            clearTimeout(this.timeoutID);
        }
    }

    componentDidUpdate(prevProps) {
        if (prevProps.highlights !== this.props.highlights) {
            if (this.timeoutID) {
                clearTimeout(this.timeoutID);
            }
            this.setState({stagesApplied: 0});
            this.advance();
        }
    }

    advance() {
        this.setState(st => {
            if (st.stagesApplied < this.props.highlights.length) {
                this.timeoutID = setTimeout(() => this.advance(), 400);
                return {stagesApplied: st.stagesApplied + 1};
            } else {
                return {};
            }
        });
    }

    render() {
        let highlight = this.props.baseHighlights;
        for (let i = 0; i < this.state.stagesApplied; i++) {
            if (i < this.props.highlights.length) {
                highlight = highlight.concat(this.props.highlights[i]);
            }
        }
        return <Graph
            color={this.props.color}
            noNames={this.props.noNames}
            directed={this.props.directed}
            graph={this.props.graph}
            layout={this.props.layout}
            highlight={highlight}
            comment={this.props.comment}
            labels={this.props.labels}
            weights={this.props.weights}
            extraSVG={this.props.extraSVG}
        />;
    }
}

export function GraphAnimation(props) {
    const stepFun = props.steps;
    const [graph, layout, extraSVG] = props.graph;
    const steps = React.useMemo(() => stepFun(graph), [stepFun, graph]);

    function applySteps(base, steps) {
        for (const step of steps) {
            base = base.concat(step);
        }
        return base;
    }

    let labels = [];
    let directed = props.directed;
    let weights = [];
    const stepTypes = {
        'reset': (step, [base, current, comment]) =>
            [[], step, ""],
        'semireset': (step, [base, current, comment]) =>
            [[], step, comment],
        'add': (step, [base, current, comment]) =>
            [applySteps(base, current), step, comment],
        'replace': (step, [base, current, comment]) =>
            [base, step, comment],
        'setComment': (step, [base, current, _]) => {
            if (step.length > 1) {
                const stepType = stepTypes[step[1]];
                return stepType(step.slice(2), [base, current, step[0]]);
            } else {
                return [applySteps(base, current), [], step[0]];
            }
        },
        'addLabel': (step, st) => {
            labels = labels.concat(step);
            return st;
        },
        'makeDirected': (step, st) => {
            directed = step[0];
            return st;
        },
        'resetLabels': (step, st) => {
            labels = step;
            return st;
        },
        'setWeights': (step, st) => {
            weights = step;
            return st;
        },
        'combo': (step, st) => {
            for (const part of step) {
                st = stepTypes[part[0]](part.slice(1), st);
            }

            return st;
        },
    };

    let step = useSteps(steps.length - 1);
    if (step > steps.length - 1) step = steps.length - 1;
    let state = [[], [], ''];
    for (let i = 0; i <= step; i++) {
        const stepType = stepTypes[steps[i][0]];
        state = stepType(steps[i].slice(1), state);
    }

    return <StaggerredHighlights
        color={props.color} noNames={props.noNames}
        directed={directed}
        graph={graph} layout={layout}
        baseHighlights={state[0]} highlights={state[1]} comment={state[2]}
        labels={labels} weights={weights}
        extraSVG={extraSVG} />
}
