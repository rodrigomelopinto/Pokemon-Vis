(function() {
  d3.parsets = function() {
    var dispatch = d3.dispatch("sortDimensions", "sortCategories"),
        dimensions_ = autoDimensions,
        dimensionFormat = String,
        tooltip_ = defaultTooltip,
        categoryTooltip = defaultCategoryTooltip,
        value_,
        spacing = 20,
        width,
        height,
        duration = 500;

    function parsets(selection) {
      selection.each(function(data, i) {
        var g = d3.select(this),
            ordinal = d3.scaleOrdinal(),
            dragging = false,
            dimensionNames = dimensions_.call(this, data, i),
            dimensions = [],
            tree = {children: {}, count: 0},
            nodes,
            total;

        d3.select(window).on("mousemove.parsets." + ++parsetsId, unhighlight);

        g.selectAll(".ribbon, .ribbon-mouse")
            .data(["ribbon", "ribbon-mouse"], String)
          .enter().append("g")
            .attr("class", String);
        updateDimensions();

        function updateDimensions() {
          // Cache existing bound dimensions to preserve sort order.
          var dimension = g.selectAll("g.dimension"),
              cache = {};
          dimension.each(function(d) { cache[d.name] = d; });
          dimensionNames.forEach(function(d) {
            if (!cache.hasOwnProperty(d)) {
              cache[d] = {name: d, categories: []};
            }
            dimensions.push(cache[d]);
          });
          dimensions.sort(compareY);
          // Populate tree with existing nodes.
          g.select(".ribbon").selectAll("path")
              .each(function(d) {
                var path = d.path.split("\0"),
                    node = tree,
                    n = path.length - 1;
                for (var i = 0; i < n; i++) {
                  var p = path[i];
                  node = node.children.hasOwnProperty(p) ? node.children[p]
                      : node.children[p] = {children: {}, count: 0};
                }
                node.children[d.name] = d;
              });
          tree = buildTree(tree, data, dimensions.map(dimensionName), value_);
          cache = dimensions.map(function(d) {
            var t = {};
            d.categories.forEach(function(c) {
              t[c.name] = c;
            });
            return t;
          });
          (function categories(d, i) {
            if (!d.children) return;
            var dim = dimensions[i],
                t = cache[i];
            for (var k in d.children) {
              if (!t.hasOwnProperty(k)) {
                dim.categories.push(t[k] = {name: k});
              }
              categories(d.children[k], i + 1);
            }
          })(tree, 0);
          ordinal.domain([]).range(d3.range(dimensions[0].categories.length));
          nodes = layout(tree, dimensions, ordinal);
          total = getTotal(dimensions);
          dimensions.forEach(function(d) {
            d.count = total;
          });
          dimension = dimension.data(dimensions, dimensionName);

          var dEnter = dimension.enter().append("g")
              .attr("class", "dimension")
              .attr("transform", function(d) { return "translate(0," + d.y + ")"; })
              .on("mousedown.parsets", function(event,d){cancelEvent(event)});
          dimension = dEnter.merge(dimension);
          dimension.each(function(d) {
                d.y0 = d.y;
                d.categories.forEach(function(d) { d.x0 = d.x; });
              });
          dEnter.append("rect")
              .attr("width", width)
              .attr("y", -45)
              .attr("height", 45);
          var textEnter = dEnter.append("text")
              .attr("class", "dimension")
              .attr("transform", "translate(0,-25)");
          textEnter.append("tspan")
              .attr("class", "name")
              .text(dimensionFormatName);
          textEnter.append("tspan")
              .attr("class", "sort alpha")
              .attr("dx", "2em")
              .text("alpha »")
              .on("mousedown.parsets", function(event,d){cancelEvent(event)});
          textEnter.append("tspan")
              .attr("class", "sort size")
              .attr("dx", "2em")
              .text("size »")
              .on("mousedown.parsets", function(event,d){cancelEvent(event)});
          dimension
              .call(d3.drag()
                .on("start", function(event,d) {
                  dragging = true;
                  d.y0 = d.y;
                })
                .on("drag", function(event,d) {
                  d.y0 = d.y = event.y;
                  for (var i = 1; i < dimensions.length; i++) {
                    if (height * dimensions[i].y < height * dimensions[i - 1].y) {
                      dimensions.sort(compareY);
                      dimensionNames = dimensions.map(dimensionName);
                      ordinal.domain([]).range(d3.range(dimensions[0].categories.length));
                      nodes = layout(tree = buildTree({children: {}, count: 0}, data, dimensionNames, value_), dimensions, ordinal);
                      total = getTotal(dimensions);
                      g.selectAll(".ribbon, .ribbon-mouse").selectAll("path").remove();
                      updateRibbons();
                      updateCategories(dimension);
                      dimension.transition().duration(duration)
                          .attr("transform", translateY)
                          .tween("ribbon", ribbonTweenY);
                      dispatch.call("sortDimensions");
                      break;
                    }
                  }
                  d3.select(this)
                      .attr("transform", "translate(0," + d.y + ")")
                      .transition();
                  ribbon.filter(function(r) { return r.source.dimension === d || r.target.dimension === d; })
                      .attr("d", ribbonPath);
                })
                .on("end", function(event,d) {
                  dragging = false;
                  unhighlight();
                  var y0 = 45,
                      dy = (height - y0 - 2) / (dimensions.length - 1);
                  dimensions.forEach(function(d, i) {
                    d.y = y0 + i * dy;
                  });
                  transition(d3.select(this))
                      .attr("transform", "translate(0," + d.y + ")")
                      .tween("ribbon", ribbonTweenY);

                  dimensionOrder = [];
                  for(const dim in dimensions){
                    dimensionOrder.push(dimensions[dim].name);
                  }
                }));
          dimension.select("text").select("tspan.sort.alpha")
              .on("click.parsets", sortBy("alpha", function(a, b) { return a.name < b.name ? 1 : -1; }, dimension));
          dimension.select("text").select("tspan.sort.size")
              .on("click.parsets", sortBy("size", function(a, b) { return a.count - b.count; }, dimension));
          dimension.transition().duration(duration)
              .attr("transform", function(d) { return "translate(0," + d.y + ")"; })
              .tween("ribbon", ribbonTweenY);
          dimension.exit().remove();

          updateCategories(dimension);
          updateRibbons();
        }

        function sortBy(type, f, dimension) {
          return function(d) {
            var direction = this.__direction = -(this.__direction || 1);
            d3.select(this).text(direction > 0 ? type + " »" : "« " + type);
            d.categories.sort(function() { return direction * f.apply(this, arguments); });
            nodes = layout(tree, dimensions, ordinal);
            updateCategories(dimension);
            updateRibbons();
            dispatch.call("sortCategories");
          };
        }

        function updateRibbons() {
          ribbon = g.select(".ribbon").selectAll("path")
              .data(nodes, function(d) { return d.path; });
          var ribbonEnter = ribbon.enter().append("path")
              .each(function(d) {
                d.source.x0 = d.source.x;
                d.target.x0 = d.target.x;
              })
              .attr("class", function(d) { return "category-0"; })
              .attr("d", ribbonPath);
          ribbon.exit().remove();
          ribbon = ribbonEnter.merge(ribbon);
          ribbon.sort(function(a, b) { return b.count - a.count; });
          var mouse = g.select(".ribbon-mouse").selectAll("path")
              .data(nodes, function(d) { return d.path; });
          mouse.enter().append("path")
              .on("mousemove.parsets", function(event,d) {
                ribbon.classed("active", false);
                if (dragging) return;
                highlight(d = d.node, true);
                showTooltip(tooltip_.call(this, d),event);
                event.stopPropagation();
              })
              .on("click.parsets", function(event,d) {
                if (dragging) return;
                i = 0;
                while (i < ribbon._groups[0].length){
                  if(ribbon._groups[0][i].className.baseVal.includes("selected2")){
                    ribbon.classed("selected1", false);
                    ribbon.classed("selected2", false);
                    selection1(d = d.node,true);
                    break;
                  }
                  i = i + 1;
                }
                var j = 0
                if(i == ribbon._groups[0].length){
                  while (j < ribbon._groups[0].length){
                    if(ribbon._groups[0][j].className.baseVal.includes("selected1")){
                      ribbon.classed("selected2", false);
                      selection2(d = d.node,true);
                      break;
                    }
                    j = j + 1;
                  }
                }

                if(j == ribbon._groups[0].length){
                  ribbon.classed("selected1", false);
                  ribbon.classed("selected2", false);
                  selection1(d = d.node,true);
                }
                event.stopPropagation();
              })
            .merge(mouse)
              .sort(function(a, b) { return b.count - a.count; })
              .attr("d", ribbonPathStatic);
          mouse.exit().remove();
        }

        // Animates the x-coordinates only of the relevant ribbon paths.
        function ribbonTweenX(d) {
          var nodes = [d],
              r = ribbon.filter(function(r) {
                var s, t;
                if (r.source.node === d) nodes.push(s = r.source);
                if (r.target.node === d) nodes.push(t = r.target);
                return s || t;
              }),
              i = nodes.map(function(d) { return d3.interpolateNumber(d.x0, d.x); }),
              n = nodes.length;
          return function(t) {
            for (var j = 0; j < n; j++) nodes[j].x0 = i[j](t);
            r.attr("d", ribbonPath);
          };
        }

        // Animates the y-coordinates only of the relevant ribbon paths.
        function ribbonTweenY(d) {
          var r = ribbon.filter(function(r) { return r.source.dimension.name == d.name || r.target.dimension.name == d.name; }),
              i = d3.interpolateNumber(d.y0, d.y);
          return function(t) {
            d.y0 = i(t);
            r.attr("d", ribbonPath);
          };
        }

        // Highlight a node and its descendants, and optionally its ancestors.
        function highlight(d, ancestors) {
          if (dragging) return;
          var highlight = [];
          (function recurse(d) {
            highlight.push(d);
            for (var k in d.children) recurse(d.children[k]);
          })(d);
          highlight.shift();
          if (ancestors) while (d) highlight.push(d), d = d.parent;
          ribbon.filter(function(d) {
            var active = highlight.indexOf(d.node) >= 0;
            if (active) this.parentNode.appendChild(this);
            return active;
          }).classed("active", true);
        }

        function selection1(d, ancestors) {
          if (dragging) return;
          var highlight = [];
          (function recurse(d) {
            highlight.push(d);
            for (var k in d.children) recurse(d.children[k]);
          })(d);
          highlight.shift();

          selectedCat1 = [];
          dimOrder1 = [];
          selectedCat2 = [];
          dimOrder2 = [];
          
          if (ancestors){ 
            highlight.push(d), d = d.parent;
            var str = highlight[highlight.length - 1].path;
            
            for(const dim in dimensions){
              dimOrder1.push(dimensions[dim].name);
            }
            
            while (true){
              if(str.includes('\u0000')){
                selectedCat1.push(str.substring(0, str.indexOf('\u0000')));
                str = str.substring(str.indexOf('\u0000') + 1);
              }
              else{
                selectedCat1.push(str.substring(0));
                break;
              }
            }
          }
          else{
            dimOrder1[0] = d.dimension;
            selectedCat1.push(d.name);
          }

          updateBoxPlot();
          updatePC();

          ribbon.filter(function(d) {
            var selected = highlight.indexOf(d.node) >= 0;
            if (selected) this.parentNode.appendChild(this);
            return selected;
          }).classed("selected1", true);
        }

        function selection2(d, ancestors) {
          if (dragging) return;
          var highlight = [];
          (function recurse(d) {
            highlight.push(d);
            for (var k in d.children) recurse(d.children[k]);
          })(d);
          highlight.shift();

          selectedCat2 = [];
          dimOrder2 = [];
          
          if (ancestors){ 
            highlight.push(d), d = d.parent;
            var str = highlight[highlight.length - 1].path;
            
            for(const dim in dimensions){
              dimOrder2.push(dimensions[dim].name);
            }
            
            while (true){
              if(str.includes('\u0000')){
                selectedCat2.push(str.substring(0, str.indexOf('\u0000')));
                str = str.substring(str.indexOf('\u0000') + 1);
              }
              else{
                selectedCat2.push(str.substring(0));
                break;
              }
            }
          }
          else{
            dimOrder2[0] = d.dimension;
            selectedCat2.push(d.name);
          }
          
          updateBoxPlot();
          updatePC();

          ribbon.filter(function(d) {
            var selected = highlight.indexOf(d.node) >= 0;
            if (selected) this.parentNode.appendChild(this);
            return selected;
          }).classed("selected2", true);
        }

        // Unhighlight all nodes.
        function unhighlight() {
          if (dragging) return;
          ribbon.classed("active", false);
          hideTooltip();
        }

        function updateCategories(g) {
          var category = g.selectAll("g.category")
              .data(function(d) { return d.categories; }, function(d) { return d.name; });
          var categoryEnter = category.enter().append("g")
              .attr("class", "category")
              .attr("transform", function(d) { return "translate(" + d.x + ")"; });
          category.exit().remove();
          category = categoryEnter.merge(category)
              .on("mousemove.parsets", function(event,d) {
                ribbon.classed("active", false);
                if (dragging) return;
                d.nodes.forEach(function(d) { highlight(d); });
                showTooltip(categoryTooltip.call(this, d),event);
                event.stopPropagation();
              })
              .on("mouseout.parsets", unhighlight)
              .on("click.parsets", function(event,d) {
                if (dragging) return;
                i = 0;
                while (i < ribbon._groups[0].length){
                  if(ribbon._groups[0][i].className.baseVal.includes("selected2")){
                    ribbon.classed("selected1", false);
                    ribbon.classed("selected2", false);
                    d.nodes.forEach(function(d) {selection1(d);});
                    break;
                  }
                  i = i + 1;
                }
                var j = 0
                if(i == ribbon._groups[0].length){
                  while (j < ribbon._groups[0].length){
                    if(ribbon._groups[0][j].className.baseVal.includes("selected1")){
                      ribbon.classed("selected2", false);
                      d.nodes.forEach(function(d) {selection2(d);});
                      break;
                    }
                    j = j + 1;
                  }
                }

                if(j == ribbon._groups[0].length){
                  ribbon.classed("selected1", false);
                  ribbon.classed("selected2", false);
                  d.nodes.forEach(function(d) {selection1(d);});
                }
                event.stopPropagation();
              })
              .on("mousedown.parsets", function(event,d){cancelEvent(event)})
              .call(d3.drag()
                .on("start", function(event,d) {
                  dragging = true;
                  d.x0 = d.x;
                })
                .on("drag", function(event,d) {
                  d.x = event.x;
                  var categories = d.dimension.categories;
                  for (var i = 0, c = categories[0]; ++i < categories.length;) {
                    if (c.x + c.dx / 2 > (c = categories[i]).x + c.dx / 2) {
                      categories.sort(function(a, b) { return a.x + a.dx / 2 - b.x - b.dx / 2; });
                      nodes = layout(tree, dimensions, ordinal);
                      updateRibbons();
                      updateCategories(g);
                      highlight(d.node);
                      dispatch.call("sortCategories");
                      break;
                    }
                  }
                  var x = 0,
                      p = spacing / (categories.length - 1);
                  categories.forEach(function(e) {
                    if (d === e) e.x0 = event.x;
                    e.x = x;
                    x += e.count / total * (width - spacing) + p;
                  });
                  d3.select(this)
                      .attr("transform", function(d) { return "translate(" + d.x0 + ")"; })
                      .transition();
                  ribbon.filter(function(r) { return r.source.node === d || r.target.node === d; })
                      .attr("d", ribbonPath);
                })
                .on("end", function(event,d) {
                  dragging = false;
                  unhighlight();
                  updateRibbons();
                  transition(d3.select(this))
                      .attr("transform", "translate(" + d.x + ")")
                      .tween("ribbon", ribbonTweenX);
                }));
          category.transition().duration(duration)
              .attr("transform", function(d) { return "translate(" + d.x + ")"; })
              .tween("ribbon", ribbonTweenX);

          categoryEnter.append("rect")
              .attr("width", function(d) { return d.dx; })
              .attr("y", -20)
              .attr("height", 20);
          categoryEnter.append("line")
              .style("stroke-width", 2);
          categoryEnter.append("text")
              .attr("dy", "-.3em");
          category.select("rect")
              .attr("width", function(d) { return d.dx; })
              .attr("class", function(d) {
                return "category-0";
              });
          category.select("line")
              .attr("x2", function(d) { return d.dx; });
          category.select("text")
              .text(truncateText(function(d) { return d.name; }, function(d) { return d.dx; }));
        }
      });
    }

    parsets.dimensionFormat = function(_) {
      if (!arguments.length) return dimensionFormat;
      dimensionFormat = _;
      return parsets;
    };

    parsets.dimensions = function(_) {
      if (!arguments.length) return dimensions_;
      dimensions_ = functor(_);
      return parsets;
    };

    parsets.value = function(_) {
      if (!arguments.length) return value_;
      value_ = functor(_);
      return parsets;
    };

    parsets.width = function(_) {
      if (!arguments.length) return width;
      width = +_;
      return parsets;
    };

    parsets.height = function(_) {
      if (!arguments.length) return height;
      height = +_;
      return parsets;
    };

    parsets.spacing = function(_) {
      if (!arguments.length) return spacing;
      spacing = +_;
      return parsets;
    };

    parsets.duration = function(_) {
      if (!arguments.length) return duration;
      duration = +_;
      return parsets;
    };

    parsets.tooltip = function(_) {
      if (!arguments.length) return tooltip;
      tooltip_ = _ == null ? defaultTooltip : _;
      return parsets;
    };

    parsets.categoryTooltip = function(_) {
      if (!arguments.length) return categoryTooltip;
      categoryTooltip = _ == null ? defaultCategoryTooltip : _;
      return parsets;
    };

    var body = d3.select("body");
    var tooltip = body.append("div")
        .style("display", "none")
        .attr("class", "parsets tooltip");

    parsets.on = function() {
      var value = dispatch.on.apply(dispatch, arguments);
      return value === dispatch ? parsets : value;
    };

    return parsets.value(1).width(960).height(600);

    function dimensionFormatName(d, i) {
      return dimensionFormat.call(this, d.name, i);
    }

    function showTooltip(html,event) {
      tooltip
        .style("display", null)
        .style("left", event.x - 250 + "px")
        .style("top", event.y - 60 + "px")
        .html(html);
    }

    function hideTooltip() {
      tooltip.style("display", "none");
    }

    function transition(g) {
      return duration ? g.transition().duration(duration).ease(parsetsEase) : g;
    }

    function layout(tree, dimensions, ordinal) {
      var nodes = [],
          nd = dimensions.length,
          y0 = 45,
          dy = (height - y0 - 2) / (nd - 1);
      dimensions.forEach(function(d, i) {
        d.categories.forEach(function(c) {
          c.dimension = d;
          c.count = 0;
          c.nodes = [];
        });
        d.y = y0 + i * dy;
      });

      // Compute per-category counts.
      var total = (function rollup(d, i) {
        if (!d.children) return d.count;
        var dim = dimensions[i],
            total = 0;
        dim.categories.forEach(function(c) {
          var child = d.children[c.name];
          if (!child) return;
          c.nodes.push(child);
          var count = rollup(child, i + 1);
          c.count += count;
          total += count;
        });
        return total;
      })(tree, 0);

      // Stack the counts.
      dimensions.forEach(function(d) {
        d.categories = d.categories.filter(function(d) { return d.count; });
        var x = 0,
            p = spacing / (d.categories.length - 1);
        d.categories.forEach(function(c) {
          c.x = x;
          c.dx = c.count / total * (width - spacing);
          c.in = {dx: 0};
          c.out = {dx: 0};
          x += c.dx + p;
        });
      });

      var dim = dimensions[0];
      dim.categories.forEach(function(c) {
        var k = c.name;
        if (tree.children.hasOwnProperty(k)) {
          recurse(c, {node: tree.children[k], path: k}, 1, ordinal(k));
        }
      });

      function recurse(p, d, depth, major) {
        var node = d.node,
            dimension = dimensions[depth];
        dimension.categories.forEach(function(c) {
          var k = c.name;
          if (!node.children.hasOwnProperty(k)) return;
          var child = node.children[k];
          child.path = d.path + "\0" + k;
          var target = child.target || {node: c, dimension: dimension};
          target.x = c.in.dx;
          target.dx = child.count / total * (width - spacing);
          c.in.dx += target.dx;
          var source = child.source || {node: p, dimension: dimensions[depth - 1]};
          source.x = p.out.dx;
          source.dx = target.dx;
          p.out.dx += source.dx;

          child.node = child;
          child.source = source;
          child.target = target;
          child.major = major;
          nodes.push(child);
          if (depth + 1 < dimensions.length) recurse(c, child, depth + 1, major);
        });
      }
      return nodes;
    }

    // Dynamic path string for transitions.
    function ribbonPath(d) {
      var s = d.source,
          t = d.target;
      return ribbonPathString(s.node.x0 + s.x0, s.dimension.y0, s.dx, t.node.x0 + t.x0, t.dimension.y0, t.dx, 1);
    }

    // Static path string for mouse handlers.
    function ribbonPathStatic(d) {
      var s = d.source,
          t = d.target;
      return ribbonPathString(s.node.x + s.x, s.dimension.y, s.dx, t.node.x + t.x, t.dimension.y, t.dx, 1);
    }

    function ribbonPathString(sx, sy, sdx, tx, ty, tdx, tension) {
      var m0, m1;
      return (tension === 1 ? [
          "M", [sx, sy],
          "L", [tx, ty],
          "h", tdx,
          "L", [sx + sdx, sy],
          "Z"]
       : ["M", [sx, sy],
          "C", [sx, m0 = tension * sy + (1 - tension) * ty], " ",
               [tx, m1 = tension * ty + (1 - tension) * sy], " ", [tx, ty],
          "h", tdx,
          "C", [tx + tdx, m1], " ", [sx + sdx, m0], " ", [sx + sdx, sy],
          "Z"]).join("");
    }

    function compareY(a, b) {
      a = height * a.y, b = height * b.y;
      return a < b ? -1 : a > b ? 1 : a >= b ? 0 : a <= a ? -1 : b <= b ? 1 : NaN;
    }
  };
  d3.parsets.tree = buildTree;

  function autoDimensions(d) {
    return d.length ? Object.keys(d[0]).sort() : [];
  }

  function cancelEvent(event) {
    event.stopPropagation();
    event.preventDefault();
  }

  function dimensionName(d) { return d.name; }

  function getTotal(dimensions) {
    return dimensions[0].categories.reduce(function(a, d) {
      return a + d.count;
    }, 0);
  }

  // Given a text function and width function, truncates the text if necessary to
  // fit within the given width.
  function truncateText(text, width) {
    return function(d, i) {
      var t = this.textContent = text(d, i),
          w = width(d, i);
      if (this.getComputedTextLength() < w) return t;
      this.textContent = "…" + t;
      var lo = 0,
          hi = t.length + 1,
          x;
      while (lo < hi) {
        var mid = lo + hi >> 1;
        if ((x = this.getSubStringLength(0, mid)) < w) lo = mid + 1;
        else hi = mid;
      }
      return lo > 1 ? t.substr(0, lo - 2) + "…" : "";
    };
  }

  var percent = d3.format("%"),
      comma = d3.format(",f"),
      parsetsEase = d3.easeElastic,
      parsetsId = 0;

  // Construct tree of all category counts for a given ordered list of
  // dimensions.  Similar to d3.nest, except we also set the parent.
  function buildTree(root, data, dimensions, value) {
    zeroCounts(root);
    var n = data.length,
        nd = dimensions.length;
    for (var i = 0; i < n; i++) {
      var d = data[i],
          v = +value(d, i),
          node = root;
      for (var j = 0; j < nd; j++) {
        var dimension = dimensions[j],
            category = d[dimension],
            children = node.children;
        node.count += v;
        node = children.hasOwnProperty(category) ? children[category]
            : children[category] = {
              children: j === nd - 1 ? null : {},
              count: 0,
              parent: node,
              dimension: dimension,
              name: category
            };
      }
      node.count += v;
    }
    return root;
  }

  function zeroCounts(d) {
    d.count = 0;
    if (d.children) {
      for (var k in d.children) zeroCounts(d.children[k]);
    }
  }

  function identity(d) { return d; }

  function translateY(d) { return "translate(0," + d.y + ")"; }

  function defaultTooltip(d) {
    var count = d.count,
        path = [];
    while (d.parent) {
      if (d.name) path.unshift(d.name);
      d = d.parent;
    }
    return path.join(" → ") + "<br>" + comma(count) + " (" + percent(count / d.count) + ")";
  }

  function defaultCategoryTooltip(d) {
    return d.name + "<br>" + comma(d.count) + " (" + percent(d.count / d.dimension.count) + ")";
  }

  function functor(v) {
    return typeof v === "function" ? v : function() {
      return v;
    };
  }
})();