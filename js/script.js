var data_folder = ['data/']
//var data_folder = ['data/us_canada_humanities_2017/']
var files = {
        vectors: 'snippet_vectors100.tsv',
        metadata: 'snippets_metadata-1.tsv'
};

var data = {
};

var gui_elements = {
    'vector idx for x': 0,
    'vector idx for y': 1,
    'redraw': redraw
};

var width, height;
var xValues = [];
var yValues = [];

var vectorIndices = [0, 1];

var scaleX, scaleY;
var xAxis, yAxis;
var gX, gY;
var canvas, offscreen;
let colorToDataIndex = {};

function load() {
    
    load_data(data_folder[0] + files.metadata, function(e, i) {
        
        if (typeof i === 'string') {
            set_metadata(i);
        } else {
            console.log('Unable to load a file ' + files.metadata)
        }
    });

    load_data(data_folder[0] + files.vectors, function(e, i) {
        
        if (typeof i === 'string') {
            set_vectors(i);
        } else {
            console.log('Unable to load a file ' + files.vectors)
        }
    });
};

function load_data(e, t) {
    var i, n;
    if (e === undefined) {
        return t('target undefined', undefined)
    }
    i = e.replace(/^.*\//, '');
    n = d3.select('#m__DATA__' + i.replace(/\..*$/, ''));
    if (!n.empty()) {
        return t(undefined, JSON.parse(n.html()))
    }
    if (e.search(/\.zip$/) > 0) {
        return d3.xhr(e).responseType('arraybuffer').get(function(e, n) {
            var o, r;
            if (n && n.status === 200 && n.response.byteLength) {
                o = new JSZip(n.response);
                r = o.file(i.replace(/\.zip$/, '')).asText()
            }
            return t(e, r)
        })
    }

    return d3.text(e).then(function(data) {
        return t(e, data)
    })
};


function set_metadata(text) {
    var rows = text.split(/\r?\n/);

    data = rows.map(function(t, i) {
        return {idx:i, text:t};
    });
}

function set_vectors(text) {
    var rows = d3.tsvParseRows(text);

    rows.map(function(v, i) { 
        data[i].vectors = v.slice(1, v.length).map(function(d) { return +d;} );
    });
    
    gui_elements[0] = [0, data[0].length];
    gui_elements[1] = [0, data[0].length];

    init();
    addGui();
}



function setChartZoom(svg) {
    zoom.scaleExtent([1, 15])
    .on("zoom", function(){

        var transform = d3.event.transform;

        var rescaledX, rescaledY;
        rescaledX = transform.rescaleX(scaleX);
        rescaledY = transform.rescaleY(scaleY);
        
        gX.call(xAxis.scale(rescaledX));
        gY.call(yAxis.scale(rescaledY));

        data.forEach(function(d) {
            
            var newX = +rescaledX(d.vectors[vectorIndices[0]]);
            var newY = +rescaledY(d.vectors[vectorIndices[1]]);
            var dx = d.originX - newX;
            var dy = d.originY - newY;

            if(d.textbox.created) {
                d.textbox.bbox.x -= dx;
                d.textbox.bbox.y -= dy;
            }
            
            d.x -= dx;
            d.y -= dy;

            d.originX = newX;
            d.originY = newY;
            //d.textbox = {created: false, hidden: false};
        });
        
        renderData();

        infoSVG.selectAll('.textbox[id]').attr('transform', function() {
            var d = data[this.id];
            return  'translate(' + [d.x, d.y] + ')';
        });
    });
    
    svg.call(zoom);
}

var chart, highlight, infoSVG;

function init() {
    var container = d3.select('.container').node();
    var header = d3.select('.header').node();
    container.style.height = (window.innerHeight - header.offsetHeight) + 'px';
    
    var ua = window.navigator.userAgent;
    isMSIE = (ua.indexOf('MSIE ') > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./));
    isFF = (ua.indexOf('Firefox') > 0);

    var svg = d3.select('svg');
    var svgClientNode = (isFF)? svg.node().parentNode : svg.node();
   
    var margin = {
          top: 50,
          right: 50,
          bottom: 50,
          left: 80
        };

    width = svgClientNode.clientWidth - margin.left - margin.right;
    height = svgClientNode.clientHeight - margin.top - margin.bottom;
    
    updateScale();

    zoom = d3.zoom();
    //setChartZoom(svg);

    chart = svg.append('g')
                    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    
    gX = chart.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    gY = chart.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    var canvasArea = d3.select('.container')
                        .append('div')
                        .style('left', margin.left + 'px')
                        .style('top', header.offsetHeight + margin.top + 'px')
                        .style('position', 'absolute');

    canvas = canvasArea.append('canvas')
                        .attr('width', width)
                        .attr('height', height);
                            

    offscreen = d3.select(document.createElement('canvas'))
                    .attr('width', width)
                    .attr('height', height);

    highlight = chart.append("g")
                        .attr('class', 'highlight')
                        .append("circle")
                            .attr("r", 5)
                            .attr('stroke-width', 3)
                            .attr('stroke', d3.rgb(0, 190, 200))
                            .classed("hidden", true);

    infoSVG = canvasArea.append('svg')
                .attr('width', width)
                .attr('height', height)
                .style('position', 'absolute')
                .style('top', 0)
                .style('z-index', 9998);

    setChartZoom(infoSVG);
    renderData();
}   

//Text wrapping based on https://bl.ocks.org/mbostock/7555321
function wrap(text, width) {

    text.each(function () {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            x = text.attr('x'),
            y = text.attr('y'),
            dy = 0, //parseFloat(text.attr("dy")),
            tspan = text.text(null)
                        .append('tspan')
                        .attr('x', x)
                        .attr('y', y)
                        .attr('dy', dy + 'em')
                        .attr('dominant-baseline', 'hanging');

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(' '));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(' '));
                line = [word];
                tspan = text.append('tspan')
                            .attr('x', x)
                            .attr('y', y)
                            .attr('dy', ++lineNumber * lineHeight + dy + 'em')
                            .attr('dominant-baseline', 'hanging')
                            .text(word);
            }
        }
    });
}


function updateScale() {
    xValues = yVales = [];

    data.forEach(function(d) {
        xValues.push(d.vectors[vectorIndices[0]]);
        yValues.push(d.vectors[vectorIndices[1]]);
    });

    var xDomain = [d3.min(xValues), d3.max(xValues)];
    var yDomain = [d3.min(yValues), d3.max(yValues)];

    scaleX = d3.scaleLinear()
                    .domain(xDomain)
                    .range([0, width]);

    scaleY = d3.scaleLinear()
                    .domain(yDomain)
                    .range([height, 0]);

    xAxis = d3.axisBottom(scaleX);
    yAxis = d3.axisLeft(scaleY).tickPadding(20);

    data.forEach(function(d) {
        d.originX = +scaleX(d.vectors[vectorIndices[0]]);
        d.originY = +scaleY(d.vectors[vectorIndices[1]]);
        d.x = d.originX;
        d.y = d.originY;

        d.textbox = {created: false, hidden: false};
    });
}

// drawing on canvas and interacting with data points
// based on: https://bl.ocks.org/veltman/f539d97e922b918d47e2b2d1a8bcd2dd
function renderData() {
    var context = canvas.node().getContext('2d');
    var offscreenContext = offscreen.node().getContext('2d');

    context.fillStyle = 'red';
    context.clearRect(0, 0, width, height);
    offscreenContext.clearRect(0, 0, width, height);
    
    data.forEach(function(d, i) {
        
        if(d.originX < 0 || d.originX > width || 
            d.originY < 0 || d.originY > height) return;

        const color = getColor(i);

        colorToDataIndex[color] = i;

        offscreenContext.fillStyle = color;

        context.beginPath();
        offscreenContext.beginPath();

        context.arc(d.originX, d.originY, 3, 0, 2 * Math.PI);
        offscreenContext.arc(d.originX, d.originY, 3, 0, 2 * Math.PI);

        context.fill();
        offscreenContext.fill();

    });

    infoSVG.on('mousemove', function() {
        const mouse = d3.mouse(this);
       

        var imageData = offscreenContext.getImageData(mouse[0], mouse[1], 1, 1);
        const color = d3.rgb.apply(null, imageData.data).toString();
        selectedIndex = colorToDataIndex[color];

        // console.log(color, selectedIndex, data[selectedIndex]);
        let hidden = (!selectedIndex || Math.abs(data[selectedIndex].originX - mouse[0]) > 5 
                                    || Math.abs(data[selectedIndex].originY - mouse[1]) > 5);

        highlight.classed('hidden', hidden);
        
        infoSVG.style('cursor', 'default');

        if(!hidden) {
            highlight.attr('cx', data[selectedIndex].originX)
                .attr('cy', data[selectedIndex].originY);

            infoSVG.style('cursor', 'pointer');
        }
    });

    infoSVG.on('click', function() {

        if(!selectedIndex) return;

        var d = data[selectedIndex];

        if(d.textbox.created == false) {
            var textbox = infoSVG.append('g')
                                    .attr('id', selectedIndex)
                                    .attr('class', 'textbox')
                                    .style('cursor', 'move');
            
            var textboxMargin = { 
                                    top: 15,
                                    bottom: 10,
                                    left: 10,
                                    right: 25
                                };
            
            var text = textbox.append('text')
                .attr('x', d.originX + textboxMargin.left)
                .attr('y', d.originY)
                .style('text-anchor', 'start')
                .attr('dominant-baseline', 'hanging')
                .text(function() {
                    return d.text.trim();
                }).call(wrap, 300);

            var bbox = text.node().getBBox();
            bbox.y = d.originY - bbox.height - textboxMargin.bottom;
            text.selectAll('tspan').attr('y', bbox.y);

            d.textbox.bbox = bbox;
            d.textbox.bbox.x -= textboxMargin.left;
            d.textbox.bbox.y -= textboxMargin.top;
            d.textbox.bbox.width += textboxMargin.left + textboxMargin.right;
            d.textbox.bbox.height += textboxMargin.top + textboxMargin.bottom;
            d.x = d.textbox.bbox.x;
            d.y = d.textbox.bbox.y;

            textbox.append('rect')
                .attr('x', d.textbox.bbox.x)
                .attr('y', d.textbox.bbox.y)
                .attr('width', d.textbox.bbox.width)
                .attr('height', d.textbox.bbox.height)
                .style('fill', d3.rgb(200, 200, 200, 0.5));

            textbox.append('line')
                .style('stroke', 'black')
                .attr('x1', d.textbox.bbox.x)
                .attr('y1', d.textbox.bbox.y + d.textbox.bbox.height)
                .attr('x2', d.textbox.bbox.x)
                .attr('y2', d.textbox.bbox.y + d.textbox.bbox.height);

            var closeButton = textbox.append('g').on('click', function() {
                        d.textbox.hidden =  !d.textbox.hidden;
                        textbox.classed('hidden', d.textbox.hidden);
                    });;

            let buttonRadius = 8;
            let crossOffset = buttonRadius * 0.5;
            let buttonCenterX = d.textbox.bbox.x + d.textbox.bbox.width - buttonRadius * 1.5;
            let buttonCenterY = d.textbox.bbox.y + buttonRadius * 1.5;

            closeButton.append('circle')
                    .classed('closeButton', true)
                    .attr('cx', buttonCenterX)
                    .attr('cy', buttonCenterY)
                    .attr('r', buttonRadius)
                    .style('fill', d3.rgb(0, 0, 0, 0.5))
                    .style('cursor', 'pointer');
                    
            var cross = closeButton.append('g');

            cross.style('cursor', 'pointer');

            cross.append('line')
                    .attr("x1", buttonCenterX - buttonRadius + crossOffset)
                    .attr("y1", buttonCenterY)
                    .attr("x2", buttonCenterX + buttonRadius - crossOffset)
                    .attr("y2", buttonCenterY);
                    
            cross.append('line')
                    .attr("x1", buttonCenterX)
                    .attr("y1", buttonCenterY - buttonRadius + crossOffset)
                    .attr("x2", buttonCenterX)
                    .attr("y2", buttonCenterY + buttonRadius  - crossOffset);

            cross.attr("transform", "rotate (45," + buttonCenterX + "," + buttonCenterY + ")");

            cross.style('stroke', 'white')
                .style('stroke-width', 1.5);

            d.x = 0, d.y = 0;

            textbox.call(d3.drag()
                .on('start', function() {
                    //d3.select(this).moveToFront();
                    d3.select(this).select('rect').classed('active', true);
                    d3.select(this).select('line').classed('active', true);
                })
                .on('drag', function() {
                    d.textbox.bbox.x += d3.event.dx;
                    d.textbox.bbox.y += d3.event.dy;
                    
                    d.x += d3.event.dx;
                    d.y += d3.event.dy;

                    d3.select(this).attr("transform", "translate(" + (d.x) + "," + (d.y) + ")");

                    d3.select(this).select('line')
                                    .attr("transform", "translate(" + (-d.x) + "," + (-d.y) + ")")
                                    .attr('x1', d.originX)
                                    .attr('y1', d.originY)
                                    .attr("x2", (d.textbox.bbox.x))
                                    .attr("y2", (d.textbox.bbox.y + d.textbox.bbox.height));
                })
                .on('end', function() {
                    d3.select(this).select('rect').classed('active', false);
                    d3.select(this).select('line').classed('active', false);
                }));

            d.textbox.created = true;
            d.textbox.hidden = false;
        } else if(d.textbox.hidden) {
            d.textbox.hidden =  !d.textbox.hidden;
            infoSVG.select(".textbox[id='" + selectedIndex + "']").classed('hidden', d.textbox.hidden);
        }
    });

    infoSVG.on('mouseout', () => {
        highlight.classed('hidden', true);
        infoSVG.style('cursor', 'default');
    });
}

function getColor(index) {
    return d3.rgb(
            Math.floor(index / 256 / 256) % 256,
            Math.floor(index / 256) % 256,
            index % 256)
        .toString();
}

function redraw() {
    
    updateScale();
    
    gX.call(xAxis);
    gY.call(yAxis);
    
    renderData();
    infoSVG.selectAll('*').remove();

    infoSVG.call(zoom.transform, d3.zoomIdentity);
}

function addGui() {
    var gui = new dat.GUI({ autoPlace: false });
    var customContainer = $('.gui').append($(gui.domElement));
    var svg = d3.select('svg');
    
    gui.add(gui_elements, 'vector idx for x').min(0).max(data[0].vectors.length - 1).step(1).onChange(function(v) {
        vectorIndices[0] = v;
    });

    gui.add(gui_elements, 'vector idx for y').min(0).max(data[0].vectors.length - 1).step(1).onChange(function(v) {
        vectorIndices[1] = v;
    });

    gui.add(gui_elements, 'redraw');
}