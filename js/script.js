var data_folder = ['data/PubD/', 'data/TimeD/', 'data/TranslateD/']
var data_type_name = ['PubD', 'TimeD', 'TranslateD'];
var data_type_name_existing = data_type_name.slice();
let PUBD = 0, TIMED = 1, TRANSLATED = 2;
var selectedDataType = PUBD;

var files = {
        matrix: 'matrix.tsv',
        cols: 'cols.tsv',
        rows: 'rows.tsv',
        matrix_link: 'matrixL.tsv',
        config: 'config.json'
};

var data = [{}, {}];

var gui_elements = {
    'data type': [],
    'x-axis': [],
    'y-axis': [],
    'red': [],
    'green': [],
    'blue': [],
    'size': [],
    'enable k': false,
    'k': []
};
var k = 0;
var gui;

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

var linkPath;
var scaleX = [,];
var scaleY = [,];
var xAxis = [,];
var yAxis = [,];
var gX = [,];
var gY = [,];
var canvas = [,];
var offscreen = [,];
var zoom = [,];

var selectedIndex;
var colorToDataIndex = {};
var svgClientNode;
var isFF, isMSIE;
var progressBarWidth;
var progress;
var isKEnabled = [false, false];

var chart = [,];
var highlight = [,];
var infoSVG = [,];
var legend = [,];
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


var params = {};

function getParams(url) {
//based on the comments and ideas in https://gist.github.com/jlong/2428561
    var parser = document.createElement('a');
    parser.href = url;
    var queries = parser.search.replace(/^\?/, '').split('&');
    var params = {};
    queries.forEach(function(q) {
        var split = q.split('=');
        params[split[0]] = split[1];
    });

    return params;
}

function load(reselected = false, dataType) {
    params = getParams(window.location.href);
    checkFiles(reselected, dataType);
};

function checkFiles(reselected, dataType) {
    var checked = [];

    for(var i = 0; i < data_folder.length; i++) {
        var url = data_folder[i] + files.rows;
        checked[i] = false;

        $.ajax({
            index: i,
            url: url,
            type: 'HEAD',
            complete: function(xhr, statusText) {
                if(xhr.status == 200) {
                    if(selectedDataType == -1) selectedDataType = this.index;
                } else {
                    data_type_name_existing.splice(this.index, 1);
                    if(this.index == selectedDataType)
                        selectedDataType = -1;
                }

                checked[this.index] = true;

                var done = true;
                for(var i = 0; i < checked.length; i++) {
                    done &= checked[i];
                }

                if(done) doRestForLoading(reselected, dataType);
            }
        });
    }
}

function doRestForLoading(reselected, dataType) {
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

    if(reselected) selectedDataType = dataType;
    else {
        if(typeof params['type'] != 'undefined') {
            var type = data_type_name.indexOf(params['type']);

            if(type != -1) {
                selectedDataType = type;
            }
        }
    }

    if(typeof params['leftX'] != 'undefined') {
        vectorIndices[LEFT].x = parseInt(params['leftX']);
    }

    if(typeof params['leftY'] != 'undefined') {
        vectorIndices[LEFT].y = parseInt(params['leftY']);
    }

    if(typeof params['rightX'] != 'undefined') {
        vectorIndices[RIGHT].x = parseInt(params['rightX']);
    }

    if(typeof params['rightY'] != 'undefined') {
        vectorIndices[RIGHT].y = parseInt(params['rightY']);
    }


    document.title = 'Metadata-7D: ' + data_type_name[selectedDataType];
    d3.select('h1#title').html(document.title);

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
    load_data('data/' + files.config, function(e, i) {
        if(typeof i === 'string') {
            var config = JSON.parse(i);
            linkPath = config.link_path;

            let userTitle = config.title;
            if(typeof userTitle != 'undefined') {
                d3.select('h1#title').html(document.title + ' - &#8220;' + userTitle + '&#8221;');
            }

            let geodURL = config.link_path['GeoD'];
            if(typeof geodURL != 'undefined') {
                var misc = d3.select('p#misc');

                misc.html(misc.html() + '<a href=' + geodURL + ' target=\'_blank\'>GeoD</a>');
                misc.classed('hidden', false);

            }
        } else {
            console.log('Unable to load a file ' + files.config);            
        }
    });

    load_data(data_folder[selectedDataType] + files.rows, function(e, i) {
        
        if (typeof i === 'string') {
            set_rows(i);

            load_data(data_folder[selectedDataType] + files.cols, function(e, i) {
        
                if (typeof i === 'string') {
                    set_cols(i);

                    load_data(data_folder[selectedDataType] + files.matrix, function(e, i) {
        
                        if (typeof i === 'string') {
                            set_matrix(i);

                            load_data(data_folder[selectedDataType] + files.matrix_link, function(e, i) {
                                if(typeof i === 'string') {
                                    set_matrix_link(i);
                                } else {
                                    console.log('Unable to load a file ' + files.matrix_link)
                                }
                            });
                        } else {
                            console.log('Unable to load a file ' + files.matrix)
                        }
                    });
                } else {
                    console.log('Unable to load a file ' + files.cols)
                }
            });
        } else {
            console.log('Unable to load a file ' + files.rows)
        }
    });
}

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

function set_rows(text) {
    var rows = text.split(/\r?\n/);
    if(rows[rows.length - 1] == "") rows.pop();

    data[RIGHT].vectors_metadata = rows.slice();

    rows.shift();
    rows.shift();

    data[LEFT] = rows.map(function(t, i) {
        return {idx:i, text:t, vectors:[], vectors_link:[]};
    });
    
    progress.transition().duration(1000).attr('width', function() {
        return progressBarWidth * 0.33;
    });
}

function set_cols(text) {
    var rows = text.split(/\r?\n/);

    data[LEFT].vectors_metadata = rows.slice();

    rows.shift();
    rows.shift();

    var metadata = data[RIGHT].vectors_metadata;
    data[RIGHT] = rows.map(function(t, i) {
        return {idx:i, text:t, vectors:[], vectors_link:[]};
    });

    data[RIGHT].vectors_metadata = metadata;

    progress.transition().duration(1000).attr('width', function() {
        return progressBarWidth * 0.66;
    });
}

function set_matrix(text) {
    var rows = d3.tsvParseRows(text);

    rows.map(function(v, i) {
        if(i >= 2) {
            data[LEFT][i - 2].vectors = v.map(function(d) { return +d;} );
        }

        if(i < data[RIGHT].vectors_metadata.length) {
            data[RIGHT].forEach(function(d, j) {
                data[RIGHT][j].vectors[i] = +v[j + 2];
            });
        }
    });

    progress.transition().duration(1000).attr('width', function() {
        return progressBarWidth;
    }).on('end', function() {
        d3.select('.progress').remove();
        init();
        addGui();
    });
}

function set_matrix_link(text) {
    var rows = d3.tsvParseRows(text);
    
    rows.map(function(v, i) {
        if(i >= 2) {
            data[LEFT][i - 2].vectors_link = v.map(function(d) { return d;} );
        }

        data[RIGHT].forEach(function(d, j) {
            var link = v[j + 2];
            if(typeof link == 'undefined') link = "";
            data[RIGHT][j].vectors_link[i] = link;
        });
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

            d.x -= dx;
            d.y -= dy;

            if(d.textbox.created) {
                d.textbox.bbox.x -= dx;
                d.textbox.bbox.y -= dy;
            }
            
            d.originX = newX;
            d.originY = newY;            
        });
        
        renderData(pos);
        infoSVG[pos].selectAll('.textbox[id]').attr('transform', function() {
            var d = data[pos][this.id];
            return  'translate(' + [d.x, d.y] + ')';
        });

        infoSVG[pos].selectAll('g[id^=linkbox]').attr('transform', function() {
            var d = data[pos][+this.id.substring(8)];
            return  'translate(' + [d.x, d.y] + ')';
        });
    });
    
    infoSVG[pos].call(zoom[pos]);
}

// function toggleToResize(pos) {
//     var svg = d3.select('svg')

//     width *= (pos == LEFT)? 0.5 : 2.0;
//     canvasArea[pos].attr('width', width);
    
//     offscreen[pos].attr('width', width)
//     infoSVG[pos].attr('width', width)

//    redarw(pos);
// }

function redraw(pos) {
    
    updateScale(pos);
    
    gX[pos].call(xAxis[pos]);
    gY[pos].call(yAxis[pos]);
    
    renderData(pos);
    infoSVG[pos].selectAll('*').remove();

    infoSVG[pos].call(zoom[pos].transform, d3.zoomIdentity);
}

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
                        .attr('id', 'left')
                        .style('left', margin.left + 'px')
                        .style('top', header.offsetHeight + margin.top + 'px')
                        .style('position', 'absolute');
    
    canvasArea[RIGHT] = d3.select('.container')
                        .append('div')
                        .attr('id', 'right')
                        .style('left', (width + margin.left + padding.left + padding.right) + 'px')
                        .style('top', header.offsetHeight + margin.top + 'px')
                        .style('position', 'absolute');
    
    for(var pos = 0; pos < 2; pos++) {
        var strPos = (pos == LEFT)? 'left':'right';
        gX[pos]= chart[pos].append('g')
            .attr('class', 'x-axis-' + strPos)
            .attr('transform', 'translate(0,' + height + ')')
            .call(xAxis[pos]);

        gY[pos] = chart[pos].append('g')
            .attr('class', 'y-axis-' + strPos)
            .call(yAxis[pos]);

        canvas[pos] = canvasArea[pos].append('canvas')
                        .attr('width', width)
                        .attr('height', height);
        
        offscreen[pos] = d3.select(document.createElement('canvas'))
                .attr('width', width)
                .attr('height', height);

        highlight[pos] = chart[pos].append("g")
                .attr('class', 'highlight-' + strPos)
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

        chart[pos].append('text')
            .attr('class', 'x-title-' + strPos)
            .attr('text-anchor', 'middle')
            .attr('transform', 'translate(' + [width, height + margin.bottom * 0.7] + ')')
            .text(data[pos].vectors_metadata[vectorIndices[pos].x]);

        chart[pos].append('text')
            .attr('class', 'y-title-' + strPos)
            .attr('text-anchor', 'middle')
            .attr('transform', 'translate(' + [-20, -margin.top * 0.2] + ')')
            .text('Publisher')
    }

    setChartZoom(LEFT);
    setChartZoom(RIGHT);
    // renderData(LEFT);
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

function updateAxesTitle(pos) {
    var strPos = (pos == LEFT)? 'left':'right';
    chart[pos].select('.x-title-' + strPos)
            .text(data[pos].vectors_metadata[vectorIndices[pos].x]);
    chart[pos].select('.y-title-' + strPos)
            .text(data[pos].vectors_metadata[vectorIndices[pos].y])
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
                    .range([0, 250]);

    scaleGreen[pos] = d3.scaleLinear()
                    .domain(gDomain)
                    .range([0, 250]);

    scaleBlue[pos] = d3.scaleLinear()
                    .domain(bDomain)
                    .range([0, 250]);
}

function updateLegend(pos) {
    var svg = d3.select('svg');

    if(typeof legend[pos] != 'undefined') legend[pos].remove();

    var classAttr = (pos == LEFT)? 'legendSizeLeft' : 'legendSizeRight';
    var yPosOffset = (pos == LEFT)? 150 : 30;
    var title = (pos == LEFT)? 'Size Scale for the Left Chart' : 'Size Scale for the Right Chart';

    legend[pos] = svg.append('g')
            .attr('class', classAttr)
            .attr('transform', 'translate(' + [10, height - yPosOffset] + ')');

    var legendSize = d3.legendSize()
                    .scale(scaleSize[pos])
                    .labelFormat(d3.format('.2s'))
                    .shape('circle')
                    .shapePadding(25)
                    .labelOffset(20)
                    .title(title)
                    .orient('horizontal');

    legend[pos].call(legendSize);

    legend[pos].select('.legendTitle')
        .style('text-anchor', 'start');
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

function customFormat(val) {
    return (Math.abs(val) >= 1) ? d3.format('.2s')(val) : d3.format('.03f')(val);
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
    
    xAxis[pos] = d3.axisBottom(scaleX[pos]).tickFormat(customFormat);
    yAxis[pos] = d3.axisLeft(scaleY[pos]).tickPadding(20).tickFormat(customFormat);


    data[pos].forEach(function(d) {
        d.originX = +scaleX[pos](d.vectors[vectorIndices[pos].x]);
        d.originY = +scaleY[pos](d.vectors[vectorIndices[pos].y]);
        d.x = d.originX;
        d.y = d.originY;

        d.textbox = {created: false, hidden: false};
        d.linkbox = {created: false, hidden: false};
    });
}

// drawing on canvas and interacting with data points
// based on: https://bl.ocks.org/veltman/f539d97e922b918d47e2b2d1a8bcd2dd
function renderData(pos) {

    if(typeof scaleSize[pos] == 'undefined') return;

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

        context.strokeStyle = 'black';

        context.beginPath();
        offscreenContext.beginPath();

        context.arc(d.originX, d.originY, scaleSize[pos](d.vectors[vectorIndices[pos].size]), 0, 2 * Math.PI);
        offscreenContext.arc(d.originX, d.originY, scaleSize[pos](d.vectors[vectorIndices[pos].size]), 0, 2 * Math.PI);
        
        //k = [0, 1]
        //checkbox ui for deciding to apply k factor
        var k = (isKEnabled[pos])? scaleK[pos](d.vectors[vectorIndices[pos].k]) : 1;
        var c = d3.rgb(scaleRed[pos](d.vectors[vectorIndices[pos].r]) * k,
                        scaleGreen[pos](d.vectors[vectorIndices[pos].g]) * k,
                        scaleBlue[pos](d.vectors[vectorIndices[pos].b]) * k).toString();
        
        context.fillStyle = c;
        context.fill();
        context.stroke();
        offscreenContext.fill();
    });

    infoSVG[pos].on('mousemove', function() {
        const mouse = d3.mouse(this);
       

        var imageData = offscreenContext.getImageData(mouse[0], mouse[1], 1, 1);
        const color = d3.rgb.apply(null, imageData.data).toString();
        selectedIndex = colorToDataIndex[color];

        //console.log(color, selectedIndex, data[pos][selectedIndex]);

        let hidden = (typeof selectedIndex == 'undefined' || Math.abs(data[pos][selectedIndex].originX - mouse[0]) > 5 
                                    || Math.abs(data[pos][selectedIndex].originY - mouse[1]) > 5);

        highlight[pos].classed('hidden', hidden);
        
        infoSVG[pos].style('cursor', 'default');

        if(!hidden) {
            highlight[pos].attr('cx', data[pos][selectedIndex].originX)
                .attr('cy', data[pos][selectedIndex].originY);
            highlight[pos].attr('r', scaleSize[pos](data[pos][selectedIndex].vectors[vectorIndices[pos].size]) + 3);
            infoSVG[pos].style('cursor', 'pointer');
        } else selectedIndex = -1;
    });

    infoSVG[pos].on('click', function() {
        if(selectedIndex == -1 || typeof selectedIndex == 'undefined') return;

        var d = data[pos][selectedIndex];
        
        if(d.textbox.created == false) {
            var textboxMargin = { 
                                    top: 15,
                                    bottom: 10,
                                    left: 10,
                                    right: 25
                                };

            var textbox = infoSVG[pos].append('g')
                                    .attr('id', selectedIndex)
                                    .attr('class', 'textbox')
                                    .style('cursor', 'pointer');

            var text = textbox.append('text')
                .attr('x', d.originX + textboxMargin.left)
                .attr('y', d.originY)
                .style('text-anchor', 'start')
                .attr('dominant-baseline', 'hanging')
                .text(function() {
                    //console.log(d.vectors_link[selectedIndex]);
                    return d.text.trim();
                }).call(wrap, 300);

            textbox.on('mouseover', function() {
                text.style('fill', 'blue');
            })
            .on('mouseout', function() {
                text.style('fill', 'black')
            })
            .on('click', function() {
                var posToUpdate = (pos == LEFT)? RIGHT : LEFT;
                vectorIndices[posToUpdate].y = d.idx + 2; //+1 because 'All Topics' or 'Entire Corpus'
                vectorIndices[posToUpdate].r = d.idx + 2; //+1 because 'All Topics' or 'Entire Corpus'
                setChartZoom(posToUpdate);
                updateSizeScale(posToUpdate);
                updateColorScale(posToUpdate);
                updateKValueScale(posToUpdate);
                renderData(posToUpdate);
                redraw(posToUpdate);
                updateAxesTitle(posToUpdate);

                gui.yAxis[posToUpdate].setValue(data[posToUpdate].vectors_metadata[vectorIndices[posToUpdate].y]);
                gui.red[posToUpdate].setValue(data[posToUpdate].vectors_metadata[vectorIndices[posToUpdate].r]);
                
            });

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

            if(d.textbox.bbox.width < 160) d.textbox.bbox.width = 160;
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

            var linkbox = null;
            
            var width = (d.textbox.bbox.width > 160)? d.textbox.bbox.width : 160;

            var listX = d.vectors_link[vectorIndices[pos].x];
            var listY = d.vectors_link[vectorIndices[pos].y];
            
            var list = "";
            if(typeof listX != 'undefined') list = listX.trim();
            list += " ";
            if(typeof listY != 'undefined') list += listY.trim();
            list = list.trim();

            if(list != "") {
                linkbox = infoSVG[pos].append('g')
                                    .attr('id', 'linkbox-' + selectedIndex)
                                    .style('cursor', 'pointer');

                var fo = linkbox.append('foreignObject')
                    .attr('x', d.originX)
                    .attr('y', d.originY)
                    .attr('width', width)
                    .attr('height', '150')
                    .on('mouseover', function() { infoSVG[pos].on('.zoom', null); })
                    .on('mouseout', function() { setChartZoom(pos);});
                
                var URLFormat = linkPath[data_type_name[selectedDataType]];
                
                var div = fo.append('xhtml:div')
                        .attr('class', 'linkbox')
                        .style('font-size', '11px')
                        .style('overflow-y', 'scroll')
                        .style('word-break', 'break-all')
                        .style('word-wrap', 'break-word')
                        .style('background-color', d3.rgb(200, 200, 200, 0.9))
                        .style('height', '100%')
                        .html(function() {
                            list = list.split(' ');
                            var html = "<ul>";
                            for(var i = 0; i < list.length;) {
                                if(list[i] == "") {
                                    i++;
                                } else {
                                    
                                    html += "<li><span><a href='" + URLFormat + list[i] 
                                    + "' target=\'_blank\'>" + list[i] 
                                    + "(" + list[i + 1] + ")</a></span></li>" 
                                    i += 2;
                                }
                            }
                            html += "</ul>"

                            return html;
                        });

                d.linkbox.created = true;
            }

            var closeButton = textbox.append('g').on('click', function() {
                        d.textbox.hidden = !d.textbox.hidden;
                        
                        textbox.classed('hidden', d.textbox.hidden);

                        if(d.linkbox.created) {
                            d.linkbox.hidden = !d.linkbox.hidden;
                            linkbox.classed('hidden', d.linkbox.hidden);
                        }

                        d3.event.stopPropagation();
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
                })
                .on('drag', function() {
                    if(d3.select(this).select('rect').classed('active') == false) {
                        d3.select(this).select('rect').classed('active', true);
                        d3.select(this).select('line').classed('active', true);
                        textbox.style('cursor', 'move');
                    }

                    d.textbox.bbox.x += d3.event.dx;
                    d.textbox.bbox.y += d3.event.dy;

                    d.x += d3.event.dx;
                    d.y += d3.event.dy;

                    d3.select(this).attr("transform", "translate(" + (d.x) + "," + (d.y) + ")");
                    //console.log(d.linkbox.created);
                    if(d.linkbox.created) {
                        var id = d3.select(this).attr('id')
                        //console.log(id);
                        infoSVG[pos].select("g[id='linkbox-" + id + "']").attr("transform", "translate(" + (d.x) + "," + (d.y) + ")");
                        //linkbox.select('ul').attr("transform", "translate(" + (d.x) + "," + (d.y) + ")");
                    }

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

                    textbox.style('cursor', 'pointer');
                }));

            d.textbox.created = true;
            d.textbox.hidden = false;
        } else if(d.textbox.hidden) {
            d.textbox.hidden = !d.textbox.hidden;
            infoSVG[pos].select(".textbox[id='" + selectedIndex + "']").classed('hidden', d.textbox.hidden);

            if(d.linkbox.created) {
                d.linkbox.hidden = !d.linkbox.hidden;
                infoSVG[pos].select("g[id='linkbox-" + selectedIndex + "']").classed('hidden', d.linkbox.hidden);
            }
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

function addGui() {
    gui = new dat.GUI({ autoPlace: false });
    var left = gui.addFolder('Left Chart');
    var right = gui.addFolder('Right Chart');
    var customContainer = $('.gui').append($(gui.domElement));
    var addingGuiFinished = false;

    gui.add(gui_elements, 'data type', data_type_name_existing).onChange(function(v) {
        if(addingGuiFinished == false) return;

        d3.select('svg').selectAll('*').remove();
        d3.selectAll('.container div').remove();
        canvas = [,];
        offscreen = [,];
        zoom = [,];
        colorToDataIndex = {};
        isKEnabled = [false, false];
        chart = [,];
        highlight = [,];
        infoSVG = [,];
        
        d3.select('.gui').html('');
        vectorIndices = [{x: 0, y: 1, r: 1, g: 0, b: 0, size: 0, k: 0},
                    {x: 0, y: 1, r: 1, g: 0, b: 0, size: 0, k: 0}];

        var index = data_type_name.indexOf(v);
        load(true, index);

    }).setValue(data_type_name[selectedDataType]);

    gui.xAxis = [];
    gui.xAxis[LEFT] = left.add(gui_elements, 'x-axis', data[LEFT].vectors_metadata).onChange(function(v) {
        vectorIndices[LEFT].x = data[LEFT].vectors_metadata.indexOf(v);
        updateAxesTitle(LEFT);
        redraw(LEFT);
    }).setValue(data[LEFT].vectors_metadata[vectorIndices[LEFT].x]);

    gui.xAxis[RIGHT] = right.add(gui_elements, 'x-axis', data[RIGHT].vectors_metadata).onChange(function(v) {
        vectorIndices[RIGHT].x = data[RIGHT].vectors_metadata.indexOf(v);
        updateAxesTitle(RIGHT);
        redraw(RIGHT);
    }).setValue(data[RIGHT].vectors_metadata[vectorIndices[RIGHT].x]);

    gui.yAxis = [];
    gui.yAxis[LEFT] = left.add(gui_elements, 'y-axis', data[LEFT].vectors_metadata).onChange(function(v) {
        vectorIndices[LEFT].y = data[LEFT].vectors_metadata.indexOf(v);
        updateAxesTitle(LEFT);
        redraw(LEFT);
    }).setValue(data[LEFT].vectors_metadata[vectorIndices[LEFT].y]);

    gui.yAxis[RIGHT] = right.add(gui_elements, 'y-axis', data[RIGHT].vectors_metadata).onChange(function(v) {
        vectorIndices[RIGHT].y = data[RIGHT].vectors_metadata.indexOf(v);
        updateAxesTitle(RIGHT);
        redraw(RIGHT);
    }).setValue(data[RIGHT].vectors_metadata[vectorIndices[RIGHT].y]);

    gui.red = [];
    gui.red[LEFT] = left.add(gui_elements, 'red', data[LEFT].vectors_metadata).onChange(function(v) {
        vectorIndices[LEFT].r = data[LEFT].vectors_metadata.indexOf(v);
        updateColorScale(LEFT);
        renderData(LEFT);
    }).setValue(data[LEFT].vectors_metadata[vectorIndices[LEFT].r]);

    gui.red[RIGHT] = right.add(gui_elements, 'red', data[RIGHT].vectors_metadata).onChange(function(v) {
        vectorIndices[RIGHT].r = data[RIGHT].vectors_metadata.indexOf(v);
        updateColorScale(RIGHT);
        renderData(RIGHT);
    }).setValue(data[RIGHT].vectors_metadata[vectorIndices[RIGHT].r]);

    gui.green = [];
    gui.green[LEFT] = left.add(gui_elements, 'green', data[LEFT].vectors_metadata).onChange(function(v) {
        vectorIndices[LEFT].g = data[LEFT].vectors_metadata.indexOf(v);
        updateColorScale(LEFT);
        renderData(LEFT);
    }).setValue(data[LEFT].vectors_metadata[vectorIndices[LEFT].g]);

    gui.green[RIGHT] = right.add(gui_elements, 'green', data[RIGHT].vectors_metadata).onChange(function(v) {
        vectorIndices[RIGHT].g = data[RIGHT].vectors_metadata.indexOf(v);
        updateColorScale(RIGHT);
        renderData(RIGHT);
    }).setValue(data[RIGHT].vectors_metadata[vectorIndices[RIGHT].g]);

    gui.blue = [];
    gui.blue[LEFT] = left.add(gui_elements, 'blue', data[LEFT].vectors_metadata).onChange(function(v) {
        vectorIndices[LEFT].b = data[LEFT].vectors_metadata.indexOf(v);
        updateColorScale(LEFT);
        renderData(LEFT);
    }).setValue(data[LEFT].vectors_metadata[vectorIndices[LEFT].b]);

    gui.blue[RIGHT] = right.add(gui_elements, 'blue', data[RIGHT].vectors_metadata).onChange(function(v) {
        vectorIndices[RIGHT].b = data[RIGHT].vectors_metadata.indexOf(v);
        updateColorScale(RIGHT);
        renderData(RIGHT);
    }).setValue(data[RIGHT].vectors_metadata[vectorIndices[RIGHT].b]);

    gui.size = [];
    gui.size[LEFT] = left.add(gui_elements, 'size', data[LEFT].vectors_metadata).onChange(function(v) {
        vectorIndices[LEFT].size = data[LEFT].vectors_metadata.indexOf(v);
        updateSizeScale(LEFT);
        updateLegend(LEFT);
        renderData(LEFT);
        
    }).setValue(data[LEFT].vectors_metadata[vectorIndices[LEFT].size]);

    gui.size[RIGHT] = right.add(gui_elements, 'size', data[RIGHT].vectors_metadata).onChange(function(v) {
        vectorIndices[RIGHT].size = data[RIGHT].vectors_metadata.indexOf(v);
        updateSizeScale(RIGHT);
        updateLegend(RIGHT);
        renderData(RIGHT);
        
    }).setValue(data[RIGHT].vectors_metadata[vectorIndices[RIGHT].size]);

    gui.kCheckbox = [];
    gui.kCheckbox[LEFT] = left.add(gui_elements, 'enable k').onChange(function(v) {
        isKEnabled[LEFT] = v;
        renderData(LEFT);
    });

    gui.kCheckbox[RIGHT] = right.add(gui_elements, 'enable k').onChange(function(v) {
        isKEnabled[RIGHT] = v;
        renderData(RIGHT);
    });

    gui.k = [];
    gui.k[LEFT] = left.add(gui_elements, 'k', data[LEFT].vectors_metadata).onChange(function(v) {
        vectorIndices[LEFT].k = data[LEFT].vectors_metadata.indexOf(v);
        updateKValueScale(LEFT);
        renderData(LEFT);
    }).setValue(data[LEFT].vectors_metadata[vectorIndices[LEFT].k]);

    gui.k[RIGHT] = right.add(gui_elements, 'k', data[RIGHT].vectors_metadata).onChange(function(v) {
        vectorIndices[RIGHT].k = data[RIGHT].vectors_metadata.indexOf(v);
        updateKValueScale(RIGHT);
        renderData(RIGHT);
    }).setValue(data[RIGHT].vectors_metadata[vectorIndices[RIGHT].k]);

    $('.dg .c select').width((isFF)? '75%': '100%');
    addingGuiFinished = true;
    //gui.add(gui_elements, 'redraw');
}