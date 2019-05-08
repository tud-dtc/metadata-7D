var data_folder = ['data/', 'data/transposed/']

var files = {
        vectors: 'matrix.tsv',
        vectors_metadata: 'cols.tsv',
        docs_metadata: 'rows.tsv'
};

var data = [{}, {}];

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

let LEFT = 0, RIGHT = 1;

var width, height;
var xValues = [[],[]];
var yValues = [[],[]];
var sizeValues = [[],[]];
var kValues = [[],[]];
var scaleSize = [,], scaleRed = [,], scaleGreen = [,], scaleBlue = [,], scaleK = [,];


var colorValues =[{r: [], g: [], b: []}, 
                 {r: [], g: [], b: []}];

 // indices for x, y, hue, saturation, brightness, and size
var vectorIndices = [{x: 0, y: 1, r: 1, g: 0, b: 0, size: 0, k: 0},
                    {x: 0, y: 1, r: 1, g: 0, b: 0, size: 0, k: 0}];


var scaleX = [,];
var scaleY = [,];
var xAxis = [,];
var yAxis = [,];
var gX = [,];
var gY = [,];
var canvas = [,];
var offscreen = [,];
var zoom = [,];

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

    // use https://github.com/d3/d3-queue later
    load_data(data_folder[0] + files.docs_metadata, function(e, i) {
        
        if (typeof i === 'string') {
            set_docs_metadata(i, LEFT);

            load_data(data_folder[0] + files.vectors, function(e, i) {
        
                if (typeof i === 'string') {
                    set_vectors(i, LEFT);

                    load_data(data_folder[0] + files.vectors_metadata, function(e, i) {
        
                        if (typeof i === 'string') {
                            set_vectors_metadata(i, LEFT);

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

    load_data(data_folder[1] + files.docs_metadata, function(e, i) {
        
        if (typeof i === 'string') {
            set_docs_metadata(i, RIGHT);

            load_data(data_folder[1] + files.vectors, function(e, i) {
        
                if (typeof i === 'string') {
                    set_vectors(i, RIGHT);

                    load_data(data_folder[1] + files.vectors_metadata, function(e, i) {
        
                        if (typeof i === 'string') {
                            set_vectors_metadata(i, RIGHT);

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

function load_data(e, t, data) {
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

function set_docs_metadata(text, pos) {
    var rows = text.split(/\r?\n/);

    data[pos] = rows.map(function(t, i) {
        return {idx:i, text:t, vectors:[]};
    });

    progress.transition().duration(1000).attr('width', function() {
        return progressBarWidth * 0.33;
    });
}

function set_vectors(text, pos) {
    var rows = d3.tsvParseRows(text);
    var firstIndex = 0;
    
    rows.map(function(v, i) {
        if(i < data[pos].length) 
            data[pos][i].vectors = v.slice(firstIndex, v.length).map(function(d) { return +d;} );
    });

    progress.transition().duration(1000).attr('width', function() {
        return progressBarWidth * 0.66;
    });
}

function set_vectors_metadata(text, pos) {
    var rows = text.split(/\r?\n/);

    if(rows.length > data[pos][0].vectors.length) rows = rows.slice(0, data[pos][0].vectors.length);

    data[pos].vectors_metadata = rows;

    progress.transition().duration(1000).attr('width', function() {
        return progressBarWidth;
    }).on('end', function() {
        d3.select('.progress').remove();
        
        if(pos == RIGHT) {
            init();
            addGui();
        }
    });
}

function setChartZoom(pos) {
    zoom[pos].scaleExtent([0.5, 15])
    .on("zoom", function(){

        var transform = d3.event.transform;

        var rescaledX, rescaledY;
        rescaledX = transform.rescaleX(scaleX[pos]);
        rescaledY = transform.rescaleY(scaleY[pos]);
        
        gX[pos].call(xAxis[pos].scale(rescaledX));
        gY[pos].call(yAxis[pos].scale(rescaledY));

        data[pos].forEach(function(d) {
            
            var newX = +rescaledX(d.vectors[vectorIndices[pos].x]);
            var newY = +rescaledY(d.vectors[vectorIndices[pos].y]);
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
        
        renderData(pos);
        infoSVG[pos].selectAll('.textbox[id]').attr('transform', function() {
            var d = data[pos][this.id];
            return  'translate(' + [d.x, d.y] + ')';
        });
    });
    
    infoSVG[pos].call(zoom[pos]);
}

var chart = [,];
var highlight = [,];
var infoSVG = [,];

// function toggleToResize(isLeftColumn) {
//     var svg = d3.select('svg')

//     width *= (isLeftColumn)? 0.5 : 2.0;

//     updateScale();
//     gX.call(xAxis);
//     gY.call(yAxis);
    
//     canvas.attr('width', width);
    
//     offscreen.attr('width', width)
//     infoSVG.attr('width', width)
           
//     renderData();
//     infoSVG.call(zoom.transform, d3.zoomIdentity);
// }

function redraw(pos) {
    
    updateScale(pos);
    
    gX[pos].call(xAxis[pos]);
    gY[pos].call(yAxis[pos]);
    
    renderData(pos);
    infoSVG[pos].selectAll('*').remove();

    infoSVG[pos].call(zoom[pos].transform, d3.zoomIdentity);
}

var margin = {
        top: 50,
        right: 10,
        bottom: 50,
        left: 300
    };

var padding = {
        left: 25,
        right: 25
    };

function init() {
    var svg = d3.select('svg');
    var header = d3.select('.header').node();

    width = svgClientNode.clientWidth - margin.left - margin.right;
    height = svgClientNode.clientHeight - margin.top - margin.bottom;
    
    width = width * 0.5 - (padding.left + padding.right);

    updateScale(LEFT);
    updateScale(RIGHT);

    zoom[LEFT] = d3.zoom();
    zoom[RIGHT] = d3.zoom();

    chart[LEFT] = svg.append('g')
                    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    
    chart[RIGHT] = svg.append('g')
                    .attr('transform', 'translate(' + (width + margin.left + padding.left + padding.right)+ ',' + margin.top + ')');
    
    var canvasArea = [,];

    canvasArea[LEFT] = d3.select('.container')
                        .append('div')
                        .style('left', margin.left + 'px')
                        .style('top', header.offsetHeight + margin.top + 'px')
                        .style('position', 'absolute');
    
    canvasArea[RIGHT] = d3.select('.container')
                        .append('div')
                        .style('left', (width + margin.left + padding.left + padding.right) + 'px')
                        .style('top', header.offsetHeight + margin.top + 'px')
                        .style('position', 'absolute');
    
    for(var pos = 0; pos < 2; pos++) {                
        gX[pos]= chart[pos].append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + height + ')')
            .call(xAxis[pos]);

        gY[pos] = chart[pos].append('g')
            .attr('class', 'y axis')
            .call(yAxis[pos]);

        canvas[pos] = canvasArea[pos].append('canvas')
                        .attr('width', width)
                        .attr('height', height);
        
        offscreen[pos] = d3.select(document.createElement('canvas'))
                .attr('width', width)
                .attr('height', height);

        highlight[pos] = chart[pos].append("g")
                .attr('class', 'highlight')
                .append("circle")
                    .attr("r", 5)
                    .attr('stroke-width', 3)
                    .attr('stroke', d3.rgb(0, 190, 200))
                    .classed("hidden", true);

        infoSVG[pos] = canvasArea[pos].append('svg')
                .attr('width', width)
                .attr('height', height)
                .style('position', 'absolute')
                .style('top', 0)
                .style('z-index', 9998);

    }

    setChartZoom(LEFT);
    updateSizeScale(LEFT);
    updateColorScale(LEFT);
    updateKValueScale(LEFT);
    renderData(LEFT);

    setChartZoom(RIGHT);
    updateSizeScale(RIGHT);
    updateColorScale(RIGHT);
    updateKValueScale(RIGHT);
    renderData(RIGHT);
}   

//Text wrapping based on https://bl.ocks.org/mbostock/7555321
//Later, use https://github.com/vijithassar/d3-textwrap instead because of the license issue
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

function updateKValueScale(pos) {
    kValues[pos] = [];

    data[pos].forEach(function(d) {
        kValues[pos].push(d.vectors[vectorIndices[pos].k]);
    });

    var kDomain = [d3.min(kValues[pos]), d3.max(kValues[pos])];

    scaleK[pos] = d3.scaleLinear()
                    .domain(kDomain)
                    .range([0, 1]);
}

function updateColorScale(pos) {
    colorValues[pos].r = [];
    colorValues[pos].g = [];
    colorValues[pos].b = [];
    
    data[pos].forEach(function(d) {
        colorValues[pos].r.push(d.vectors[vectorIndices[pos].r]);
        colorValues[pos].g.push(d.vectors[vectorIndices[pos].g]);
        colorValues[pos].b.push(d.vectors[vectorIndices[pos].b]);
    });

    var rDomain = [d3.min(colorValues[pos].r), d3.max(colorValues[pos].r)];
    var gDomain = [d3.min(colorValues[pos].g), d3.max(colorValues[pos].g)];
    var bDomain = [d3.min(colorValues[pos].b), d3.max(colorValues[pos].b)];

    scaleRed[pos] = d3.scaleLinear()
                    .domain(rDomain)
                    .range([0, 255]);

    scaleGreen[pos] = d3.scaleLinear()
                    .domain(gDomain)
                    .range([0, 255]);

    scaleBlue[pos] = d3.scaleLinear()
                    .domain(bDomain)
                    .range([0, 255]);
}

function updateSizeScale(pos) {
    sizeValues[pos] = [];

    data[pos].forEach(function(d) {
        sizeValues[pos].push(d.vectors[vectorIndices[pos].size]);
    });
    
    var sizeDomain = [d3.min(sizeValues[pos]), d3.max(sizeValues[pos])];

    scaleSize[pos] = d3.scaleLinear()
                    .domain(sizeDomain)
                    .range([2, 20]);
}

function updateScale(pos) {
    xValues[pos] = [];
    yValues[pos] = [];
    
    data[pos].forEach(function(d) {
        xValues[pos].push(d.vectors[vectorIndices[pos].x]);
        yValues[pos].push(d.vectors[vectorIndices[pos].y]);
    });

    var xDomain = [d3.min(xValues[pos]) * 0.8, d3.max(xValues[pos]) * 1.2];
    var yDomain = [d3.min(yValues[pos]) * 0.8, d3.max(yValues[pos]) * 1.2];

    scaleX[pos] = d3.scaleLinear()
                .domain(xDomain)
                .range([0, width]);

    scaleY[pos] = d3.scaleLinear()
                .domain(yDomain)
                .range([height, 0]);
    
    xAxis[pos] = d3.axisBottom(scaleX[pos]);
    yAxis[pos] = d3.axisLeft(scaleY[pos]).tickPadding(20);


    data[pos].forEach(function(d) {
        d.originX = +scaleX[pos](d.vectors[vectorIndices[pos].x]);
        d.originY = +scaleY[pos](d.vectors[vectorIndices[pos].y]);
        d.x = d.originX;
        d.y = d.originY;

        d.textbox = {created: false, hidden: false};
    });
}

// drawing on canvas and interacting with data points
// based on: https://bl.ocks.org/veltman/f539d97e922b918d47e2b2d1a8bcd2dd
function renderData(pos) {
    var context = canvas[pos].node().getContext('2d');
    var offscreenContext = offscreen[pos].node().getContext('2d');

    context.clearRect(0, 0, width, height);
    offscreenContext.clearRect(0, 0, width, height);
    
    data[pos].forEach(function(d, i) {
        
        if(d.originX < 0 || d.originX > width || 
            d.originY < 0 || d.originY > height) return;

        const color = getColor(i);

        colorToDataIndex[color] = i;

        offscreenContext.fillStyle = color;

        context.beginPath();
        offscreenContext.beginPath();

        context.arc(d.originX, d.originY, scaleSize[pos](d.vectors[vectorIndices[pos].size]), 0, 2 * Math.PI);
        offscreenContext.arc(d.originX, d.originY, scaleSize[pos](d.vectors[vectorIndices[pos].size]), 0, 2 * Math.PI);
        
        //k = [0, 1]
        //checkbox ui for deciding to apply k factor
        var k = (isKEnabled)? scaleK[pos](d.vectors[vectorIndices[pos].k]) : 1;
        var c = d3.rgb(scaleRed[pos](d.vectors[vectorIndices[pos].r]) * k,
                        scaleGreen[pos](d.vectors[vectorIndices[pos].g]) * k,
                        scaleBlue[pos](d.vectors[vectorIndices[pos].b]) * k).toString();
        
        context.fillStyle = c;
        context.fill();
        offscreenContext.fill();
    });

    var selectedIndex;

    infoSVG[pos].on('mousemove', function() {
        const mouse = d3.mouse(this);
       

        var imageData = offscreenContext.getImageData(mouse[0], mouse[1], 1, 1);
        const color = d3.rgb.apply(null, imageData.data).toString();
        selectedIndex = colorToDataIndex[color];

        // console.log(color, selectedIndex, data[selectedIndex]);
        let hidden = (!selectedIndex || Math.abs(data[pos][selectedIndex].originX - mouse[0]) > 5 
                                    || Math.abs(data[pos][selectedIndex].originY - mouse[1]) > 5);

        highlight[pos].classed('hidden', hidden);
        
        infoSVG[pos].style('cursor', 'default');

        if(!hidden) {
            highlight[pos].attr('cx', data[pos][selectedIndex].originX)
                .attr('cy', data[pos][selectedIndex].originY);
            highlight[pos].attr('r', scaleSize[pos](data[pos][selectedIndex].vectors[vectorIndices[pos].size]) + 3);
            infoSVG[pos].style('cursor', 'pointer');
        }
    });

    infoSVG[pos].on('click', function() {

        if(!selectedIndex) return;

        var d = data[pos][selectedIndex];

        if(d.textbox.created == false) {
            var textbox = infoSVG[pos].append('g')
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
            infoSVG[pos].select(".textbox[id='" + selectedIndex + "']").classed('hidden', d.textbox.hidden);
        }
    });

    infoSVG[pos].on('mouseout', () => {
        highlight[pos].classed('hidden', true);
        infoSVG[pos].style('cursor', 'default');
    });
}

function getColor(index) {
    return d3.rgb(
            Math.floor(index / 256 / 256) % 256,
            Math.floor(index / 256) % 256,
            index % 256)
        .toString();
}

var k = 0;

function addGui() {
    var gui = new dat.GUI({ autoPlace: false });
    var customContainer = $('.gui').append($(gui.domElement));
    var svg = d3.select('svg');

    gui.add(gui_elements, 'x-axis', data[LEFT].vectors_metadata).onChange(function(v) {
        vectorIndices[LEFT].x = data[LEFT].vectors_metadata.indexOf(v);
        redraw(LEFT);
    }).setValue(data[LEFT].vectors_metadata[vectorIndices[LEFT].x]);

    gui.add(gui_elements, 'y-axis', data[LEFT].vectors_metadata).onChange(function(v) {
        vectorIndices[LEFT].y = data[LEFT].vectors_metadata.indexOf(v);
        redraw(LEFT);
    }).setValue(data[LEFT].vectors_metadata[vectorIndices[LEFT].y]);

    gui.add(gui_elements, 'red', data[LEFT].vectors_metadata).onChange(function(v) {
        vectorIndices[LEFT].r = data[LEFT].vectors_metadata.indexOf(v);
        updateColorScale(LEFT);
        renderData(LEFT);
    }).setValue(data[LEFT].vectors_metadata[vectorIndices[LEFT].r]);

    gui.add(gui_elements, 'green', data[LEFT].vectors_metadata).onChange(function(v) {
        vectorIndices[LEFT].g = data[LEFT].vectors_metadata.indexOf(v);
        updateColorScale(LEFT);
        renderData(LEFT);
    }).setValue(data[LEFT].vectors_metadata[vectorIndices[LEFT].g]);

    gui.add(gui_elements, 'blue', data[LEFT].vectors_metadata).onChange(function(v) {
        vectorIndices[LEFT].b = data[LEFT].vectors_metadata.indexOf(v);
        updateColorScale(LEFT);
        renderData(LEFT);
    }).setValue(data[LEFT].vectors_metadata[vectorIndices[LEFT].b]);

    gui.add(gui_elements, 'size', data[LEFT].vectors_metadata).onChange(function(v) {
        vectorIndices[LEFT].size = data[LEFT].vectors_metadata.indexOf(v);
        updateSizeScale(LEFT);
        renderData(LEFT);
    }).setValue(data[LEFT].vectors_metadata[vectorIndices[LEFT].size]);

    gui.add(gui_elements, 'enable k').onChange(function(v) {
        isKEnabled = v;
        renderData(LEFT);
    });

    gui.add(gui_elements, 'k', data[LEFT].vectors_metadata).onChange(function(v) {
        vectorIndices[LEFT].k = data[LEFT].vectors_metadata.indexOf(v);
        updateKValueScale(LEFT);
        renderData(LEFT);
    }).setValue(data[LEFT].vectors_metadata[vectorIndices[LEFT].k]);

    $('.dg .c select').width('100%');
    //gui.add(gui_elements, 'redraw');
}