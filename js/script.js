var data_folder = ['data/']
//var data_folder = ['data/us_canada_humanities_2017/']
var files = {
        vectors: 'vectors_TVPPL.tsv',
        vectors_metadata: 'vectors_metadata.tsv',
        docs_metadata: 'docs_metadata.tsv'
};

var data = {
};

var gui_elements = {
    'x-axis': [],
    'y-axis': [],
    'red': [],
    'green': [],
    'blue': [],
    'size': [],
    'enable k': false,
    'k': []

};

var width, height;
var xValues = [];
var yValues = [];
var sizeValues = [];
var kValues = [];
var colorValues = {r: [], g: [], b: []};

var vectorIndices = {x: 151, y: 207, r: 251, g: 1, b: 1, size: 254, k: 100}; // indices for x, y, hue, saturation, brightness, and size

var scaleX, scaleY, scaleSize, scaleRed, scaleGreen, scaleBlue, scaleK;
var xAxis, yAxis;
var gX, gY;
var canvas, offscreen;
let colorToDataIndex = {};
var svgClientNode;
var isFF, isMSIE;
var progressBarWidth;
var progress;
var isKEnabled = false;

function load() {
    var ua = window.navigator.userAgent;
    isFF = (ua.indexOf('Firefox') > 0);
    isMSIE = (ua.indexOf('MSIE ') > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./));
    
    var container = d3.select('.container').node();
    var header = d3.select('.header').node();
    container.style.height = (window.innerHeight - header.offsetHeight) + 'px';
    
    var svg = d3.select('svg');
    svgClientNode = (isFF)? svg.node().parentNode : svg.node();
    width = svgClientNode.clientWidth;
    height = svgClientNode.clientHeight;

    var w = Math.max(200, width * 0.3);
    var h = 20;
    progressBarWidth = w;

    var g = svg.append('g')
                .attr('class', 'progress');

    g.append('rect')
        .attr('rx', 10)
        .attr('ry', 10)
        .attr('fill', 'gray')
        .attr('height', h)
        .attr('width', w)
        .attr('x', (width - w) * 0.5)
        .attr('y', (height - h) * 0.5);



    progress = g.append('rect')
                .attr('rx', 10)
                .attr('ry', 10)
                .attr('fill', d3.rgb(0, 200, 190))
                .attr('height', h)
                .attr('width', 10)
                .attr('x', (width - w) * 0.5)
                .attr('y', (height - h) * 0.5);
                    
    g.append('text')
        .attr('fill', 'white')
        .attr('x', (width - w) * 0.5 + 10)
        .attr('y', (height) * 0.5)
        .style('text-anchor', 'start')
        .style('dominant-baseline', 'central')
        .text('Loading data...');


    load_data(data_folder[0] + files.docs_metadata, function(e, i) {
        
        if (typeof i === 'string') {
            set_docs_metadata(i);

            load_data(data_folder[0] + files.vectors, function(e, i) {
        
                if (typeof i === 'string') {
                    set_vectors(i);

                    load_data(data_folder[0] + files.vectors_metadata, function(e, i) {
        
                        if (typeof i === 'string') {
                            set_vectors_metadata(i);
                        } else {
                            console.log('Unable to load a file ' + files.vectors_metadata)
                        }
                    });

                } else {
                    console.log('Unable to load a file ' + files.vectors)
                }
            });

            

        } else {
            console.log('Unable to load a file ' + files.docs_metadata)
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

function set_docs_metadata(text) {
    var rows = text.split(/\r?\n/);

    data = rows.map(function(t, i) {
        return {idx:i, text:t, vectors:[]};
    });

    progress.transition().duration(1000).attr('width', function() {
        return progressBarWidth * 0.33;
    });
}

function set_vectors(text) {
    var rows = d3.tsvParseRows(text);
    var firstIndex = 0;
    
    rows.map(function(v, i) {
        if(i < data.length) 
            data[i].vectors = v.slice(firstIndex, v.length).map(function(d) { return +d;} );
    });

    progress.transition().duration(1000).attr('width', function() {
        return progressBarWidth * 0.66;
    });
}

function set_vectors_metadata(text) {
    var rows = text.split(/\r?\n/);

    if(rows.length > data[0].vectors.length) rows = rows.slice(0, data[0].vectors.length);

    data.vectors_metadata = rows;

    progress.transition().duration(1000).attr('width', function() {
        return progressBarWidth;
    }).on('end', function() {
        d3.select('.progress').remove();
        
        init();
        addGui();
    });
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
            
            var newX = +rescaledX(d.vectors[vectorIndices.x]);
            var newY = +rescaledY(d.vectors[vectorIndices.y]);
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
    var svg = d3.select('svg');
    var header = d3.select('.header').node();

    var margin = {
          top: 120,
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
    updateSizeScale();
    updateColorScale();
    updateKValueScale();
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

function updateKValueScale() {
    kValues = [];

    data.forEach(function(d) {
        kValues.push(d.vectors[vectorIndices.k]);
    });

    var kDomain = [d3.min(kValues), d3.max(kValues)];

    scaleK = d3.scaleLinear()
                    .domain(kDomain)
                    .range([0, 1]);
}

function updateColorScale() {
    colorValues.r = [];
    colorValues.g = [];
    colorValues.b = [];
    
    data.forEach(function(d) {
        colorValues.r.push(d.vectors[vectorIndices.r]);
        colorValues.g.push(d.vectors[vectorIndices.g]);
        colorValues.b.push(d.vectors[vectorIndices.b]);
    });

    var rDomain = [d3.min(colorValues.r), d3.max(colorValues.r)];
    var gDomain = [d3.min(colorValues.g), d3.max(colorValues.g)];
    var bDomain = [d3.min(colorValues.b), d3.max(colorValues.b)];

    scaleRed = d3.scaleLinear()
                    .domain(rDomain)
                    .range([0, 255]);

    scaleGreen = d3.scaleLinear()
                    .domain(rDomain)
                    .range([0, 255]);

    scaleBlue = d3.scaleLinear()
                    .domain(rDomain)
                    .range([0, 255]);
}

function updateSizeScale() {
    sizeValues = [];

    data.forEach(function(d) {
        sizeValues.push(d.vectors[vectorIndices.size]);
    });
    
    var sizeDomain = [d3.min(sizeValues), d3.max(sizeValues)];

    scaleSize = d3.scaleLinear()
                    .domain(sizeDomain)
                    .range([2, 20]);
}

function updateScale() {
    xValues = [];
    yValues = [];
    
    data.forEach(function(d) {
        xValues.push(d.vectors[vectorIndices.x]);
        yValues.push(d.vectors[vectorIndices.y]);
    });

    var xDomain = [d3.min(xValues) * 0.8, d3.max(xValues) * 1.2];
    var yDomain = [d3.min(yValues) * 0.8, d3.max(yValues) * 1.2];
    
    scaleX = d3.scaleLinear()
                    .domain(xDomain)
                    .range([0, width]);

    scaleY = d3.scaleLinear()
                    .domain(yDomain)
                    .range([height, 0]);
    
    xAxis = d3.axisBottom(scaleX);
    yAxis = d3.axisLeft(scaleY).tickPadding(20);

    data.forEach(function(d) {
        d.originX = +scaleX(d.vectors[vectorIndices.x]);
        d.originY = +scaleY(d.vectors[vectorIndices.y]);
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

        context.arc(d.originX, d.originY, scaleSize(d.vectors[vectorIndices.size]), 0, 2 * Math.PI);
        offscreenContext.arc(d.originX, d.originY, scaleSize(d.vectors[vectorIndices.size]), 0, 2 * Math.PI);
        
        //k = [0, 1]
        //checkbox ui for deciding to apply k factor
        var k = (isKEnabled)? scaleK(d.vectors[vectorIndices.k]) : 1;
        var c = d3.rgb(scaleRed(d.vectors[vectorIndices.r]) * k,
                        scaleGreen(d.vectors[vectorIndices.g]) * k,
                        scaleBlue(d.vectors[vectorIndices.b]) * k).toString();
        
        context.fillStyle = c;
        context.fill();
        offscreenContext.fill();
    });

    var selectedIndex;

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
            highlight.attr('r', scaleSize(data[selectedIndex].vectors[vectorIndices.size]) + 3);
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

var k = 0;

function addGui() {
    var gui = new dat.GUI({ autoPlace: false });
    var customContainer = $('.gui').append($(gui.domElement));
    var svg = d3.select('svg');
    
    gui.add(gui_elements, 'x-axis', data.vectors_metadata).onChange(function(v) {
        vectorIndices.x = data.vectors_metadata.indexOf(v);
        redraw();
    }).setValue(data.vectors_metadata[vectorIndices.x]);

    gui.add(gui_elements, 'y-axis', data.vectors_metadata).onChange(function(v) {
        vectorIndices.y = data.vectors_metadata.indexOf(v);
        redraw();
    }).setValue(data.vectors_metadata[vectorIndices.y]);

    gui.add(gui_elements, 'red', data.vectors_metadata).onChange(function(v) {
        vectorIndices.r = data.vectors_metadata.indexOf(v);
        updateColorScale();
        renderData();
    }).setValue(data.vectors_metadata[vectorIndices.r]);

    gui.add(gui_elements, 'green', data.vectors_metadata).onChange(function(v) {
        vectorIndices.g = data.vectors_metadata.indexOf(v);
        updateColorScale();
        renderData();
    }).setValue(data.vectors_metadata[vectorIndices.g]);

    gui.add(gui_elements, 'blue', data.vectors_metadata).onChange(function(v) {
        vectorIndices.b = data.vectors_metadata.indexOf(v);
        updateColorScale();
        renderData();
    }).setValue(data.vectors_metadata[vectorIndices.b]);

    gui.add(gui_elements, 'size', data.vectors_metadata).onChange(function(v) {
        vectorIndices.size = data.vectors_metadata.indexOf(v);
        updateSizeScale();
        renderData();
    }).setValue(data.vectors_metadata[vectorIndices.size]);

    gui.add(gui_elements, 'enable k').onChange(function(v) {
        isKEnabled = v;
        console.log(v);
        renderData();
    });

    gui.add(gui_elements, 'k', data.vectors_metadata).onChange(function(v) {
        vectorIndices.k = data.vectors_metadata.indexOf(v);
        updateKValueScale();
        renderData();
    }).setValue(data.vectors_metadata[vectorIndices.k]);


    //gui.add(gui_elements, 'redraw');
}