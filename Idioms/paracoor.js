function createParallelCoordinates(id) {
    var widthC = width + 150;
    var heightC = height + 20;
    const svg = d3
      .select(id)
      .attr("width", widthC + margin.left + margin.right)
      .attr("height", heightC + margin.top + margin.bottom)
      .append("g")
      .attr("id", "gCoordChart")
      .attr("transform",
      `translate(${margin.left},${margin.top})`);
  
    d3.csv("data.csv").then(function (data) {
    keys = Object.keys(data[0]).filter(function(d) { return d != "id" && d != "outlier" && d != "name" && d != "types" && d != "weaknesses" && d != "rarity" 
                                                          && d != "resistances" && d != "evolution" && d!=""})
    

    d3.select("button").on("click", function() {
      var txtName = inputBox.value;
      var item;
      path.style("stroke", function(d) {
        if(d.name === txtName){
          item = d;
        }
        return d.name === txtName ? "red" : deselectedColor;
      })
      .style("stroke-width", function(d){
        return d.name === txtName ? 5:1;
      })
      points.style("fill", function(d){
        return d.name === txtName ? "red" : "none";
      })

      var i = ribbon._groups[0].length - 1;
      var strpath;
      var cats = [];

      while (i >= 0){
        strpath = ribbon._groups[0][i].__data__.path;
        while (true){
          if(strpath.includes('\u0000')){
            cats.push(strpath.substring(0, strpath.indexOf('\u0000')));
            strpath = strpath.substring(strpath.indexOf('\u0000') + 1);
          }
          else{
            cats.push(strpath.substring(0));
            break;
          }
        }
        if(item[dimensionOrder[0]] == cats[0] && item[dimensionOrder[1]] == cats[1] && item[dimensionOrder[2]] == cats[2] && item[dimensionOrder[3]] == cats[3] && item[dimensionOrder[4]] == cats[4]){
          highlight(ribbon._groups[0][i].__data__);
          function highlight(d) {
            var highlight = [];
            (function recurse(d) {
              highlight.push(d);
              for (var k in d.children) recurse(d.children[k]);
            })(d);
            highlight.shift();
            while (d) highlight.push(d), d = d.parent;
            ribbon.filter(function(d) {
              var active = highlight.indexOf(d.node) >= 0;
              if (active) this.parentNode.appendChild(this);
              return active;
            }).classed("active", true);
          }
          break;
        }
        cats = [];
        i = i - 1;
      }
    })

    //Create a brush
    const brush = d3.brushY()
    .extent([
      [-(brushHeight/2), 0],
      [(brushHeight/2), heightC]
    ])
    .on("start brush end", brushed);
  
    line = d3.line()
    .defined(([, value]) => value != null)
    .y(([key, value]) => y.get(key)(value))
    .x(([key]) => x(key))
  
    label = d => d.name
  
    colors = d3.interpolateLab(normalColor, normalColor)
    
    
    y = new Map(Array.from(keys, key => [key, d3.scaleLinear().domain(d3.extent(data, d => +d[key])).range([heightC,0])]))
  
    x = d3.scalePoint()
      .range([0, widthC])
      .padding(0.5)
      .domain(keys);
  
  
    const path = svg.append("g")
        .attr("fill", "none")
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.4)
        .selectAll("line.lineValue")
        .data(data)
        .join("path")
          .attr("class", "lineValue itemValue")
          .attr("stroke", normalColor)
          .attr("d", d => line(d3.cross(keys, [d], (key, d) => [key, d[key]])));
  
  
    path.append("title")
    .text(label);
    
    svg.append("g")
      .selectAll("g")
      .data(keys)
      .join("g")
        .attr("transform", d => `translate(${x(d)},0)`)
        .each(function(d) { d3.select(this).call(d3.axisLeft(y.get(d))); })
        .call(g => g.append("text")
          .style("text-anchor", "middle")
          .attr("y", -9)
          .attr("fill", "currentColor")
          .text(d => d))
        .call(g => g.selectAll("text")
          .clone(true).lower()
          .attr("fill", "none")
          .attr("stroke-width", 5)
          .attr("stroke-linejoin", "round")
          .attr("stroke", "white"))
        .call(brush);
  
      const selections = new Map();
  
      function brushed({selection}, key) {
        flag = 1;
        if (selection === null){
          selections.delete(key);
          attr = [[90,0], [200,0], [170,0], [5.0, 0]];
          updateParallelSets();
          updateBoxPlot();
        }
        else selections.set(key, selection.map(y.get(key).invert));
  
        for (let [key1, value1] of selections) {
          if (key1 == "level"){
            attr[0] = value1
          }
          if (key1 == "hp"){
            attr[1] = value1
          }
          if (key1 == "damage"){
            attr[2] = value1
          }
          if (key1 == "energyCost"){
            attr[3] = value1
          }
        }
        updateParallelSets();
        updateBoxPlot();
  
        selarray = Array.from(selections);
        const selected = [];
  
        path.each(function(d) {
          const active = selarray.every(([key, [max, min]]) => d[key] >= min && d[key] <= max);
          d3.select(this).style("stroke", function(){
            if(active){
              sMap[this.getAttribute('d')] = 1;
              return normalColor; 
            }
            else{
              sMap[this.getAttribute('d')] = 0;
              return deselectedColor;
            }})
            .style("stroke-width",1);
          if (active) {
            d3.select(this).raise();
            selected.push(d);
          }
        });
        svg.property("value", selected).dispatch("input");
      }
      
      return svg.property("value", data).node();
    });
  }


  function updatePC(){
    flag = 0;
    var widthC = width + 150;
    var heightC = height + 20;
    d3.csv("data.csv").then(function(data) {
      data = data.filter(function (elem){
        if(selectedType != "none"){
          return selectedType == elem.types;
        }
        else{
          return cat1(elem) || cat2(elem);
        }
      });
      const svg = d3.select("#gCoordChart");
      svg.selectAll("*").remove();
  
      d3.select("button").on("click", function() {
        var txtName = inputBox.value;
        var item;
        path.style("stroke", function(d) {
          if(d.name === txtName){
            item = d;
          }
          return d.name === txtName ? "red" : deselectedColor;
        })
        .style("stroke-width", function(d){
          return d.name === txtName ? 5:1;
        })
        points.style("fill", function(d){
          return d.name === txtName ? "red" : "none";
        })
  
        var i = ribbon._groups[0].length - 1;
        var strpath;
        var cats = [];
  
        while (i >= 0){
          strpath = ribbon._groups[0][i].__data__.path;
          while (true){
            if(strpath.includes('\u0000')){
              cats.push(strpath.substring(0, strpath.indexOf('\u0000')));
              strpath = strpath.substring(strpath.indexOf('\u0000') + 1);
            }
            else{
              cats.push(strpath.substring(0));
              break;
            }
          }
          if(item[dimensionOrder[0]] == cats[0] && item[dimensionOrder[1]] == cats[1] && item[dimensionOrder[2]] == cats[2] && item[dimensionOrder[3]] == cats[3] && item[dimensionOrder[4]] == cats[4]){
            highlight(ribbon._groups[0][i].__data__);
            function highlight(d) {
              var highlight = [];
              (function recurse(d) {
                highlight.push(d);
                for (var k in d.children) recurse(d.children[k]);
              })(d);
              highlight.shift();
              while (d) highlight.push(d), d = d.parent;
              ribbon.filter(function(d) {
                var active = highlight.indexOf(d.node) >= 0;
                if (active) this.parentNode.appendChild(this);
                return active;
              }).classed("active", true);
            }
            break;
          }
          cats = [];
          i = i - 1;
        }
      })
  
      //Create a brush
      const brush = d3.brushY()
      .extent([
        [-(brushHeight/2), 0],
        [(brushHeight/2), heightC]
      ])
      .on("start brush end", brushed);
  
      line = d3.line()
      .defined(([, value]) => value != null)
      .y(([key, value]) => y.get(key)(value))
      .x(([key]) => x(key))
  
      label = d => d.name
  
      colors = d3.interpolateLab(normalColor, normalColor)
  
  
      y = new Map(Array.from(keys, key => [key, d3.scaleLinear().domain(d3.extent(data, d => +d[key])).range([heightC,0])]))
  
      x = d3.scalePoint()
        .range([0, widthC])
        .padding(0.5)
        .domain(keys);
  
  
      const path = svg.append("g")
          .attr("fill", "none")
          .attr("stroke-width", 1)
          .attr("stroke-opacity", 0.4)
          .selectAll("line.lineValue")
          .data(data)
          .join("path")
            .attr("class", "lineValue itemValue")
            .attr("stroke", function(d){
              if(selIds1.includes(d.id)){
                return "#226AC1";
              }
              else if(selIds2.includes(d.id)){
                return "#22C179";
              }
              else{
                return normalColor;
              }
            })
            .attr("d", d => line(d3.cross(keys, [d], (key, d) => [key, d[key]])));
  
  
      path.append("title")
      .text(label);
  
      svg.append("g")
        .selectAll("g")
        .data(keys)
        .join("g")
          .attr("transform", d => `translate(${x(d)},0)`)
          .each(function(d) { d3.select(this).call(d3.axisLeft(y.get(d))); })
          .call(g => g.append("text")
            .style("text-anchor", "middle")
            .attr("y", -9)
            .attr("fill", "currentColor")
            .text(d => d))
          .call(g => g.selectAll("text")
            .clone(true).lower()
            .attr("fill", "none")
            .attr("stroke-width", 5)
            .attr("stroke-linejoin", "round")
            .attr("stroke", "white"))
          .call(brush);
      
      if(data.length <= 200){
        path.on("mouseover", (event, d) => handleMouseOver(d))
        .on("mouseleave", (event, d) => handleMouseLeave())
        .append("title")
        .text((d) => d.name)
      }
  
        const selections = new Map();
  
        function brushed({selection}, key) {
          flag = 1;
          if (selection === null){
            selections.delete(key);
            attr = [[90,0], [200,0], [170,0], [5.0, 0]];
            updateParallelSets();
            updateBoxPlot();
          }
          else selections.set(key, selection.map(y.get(key).invert));
  
          for (let [key1, value1] of selections) {
            if (key1 == "level"){
              attr[0] = value1
            }
            if (key1 == "hp"){
              attr[1] = value1
            }
            if (key1 == "damage"){
              attr[2] = value1
            }
            if (key1 == "energyCost"){
              attr[3] = value1
            }
          }
          updateParallelSets();
          updateBoxPlot();
  
          selarray = Array.from(selections);
          const selected = [];
  
          path.each(function(d) {
            const active = selarray.every(([key, [max, min]]) => d[key] >= min && d[key] <= max);
            d3.select(this).style("stroke", function(){
              if(active){
                sMap[this.getAttribute('d')] = 1;
                return normalColor; 
              }
              else{
                sMap[this.getAttribute('d')] = 0;
                return deselectedColor;
              }})
              .style("stroke-width",1);
            if (active) {
              d3.select(this).raise();
              selected.push(d);
            }
          });
          svg.property("value", selected).dispatch("input");
        }
  
        return svg.property("value", data).node();
    });
  }