function placeOutlier(data,stats,width,posX,posY){
    const outlen = stats.get(data.types).outliers.length;
    if(posarr.includes("["+ posX+","+posY+"]")){
      var auxPlace = 1;
      var auxPlace2 = -1;
      var pos = 0;
      while(auxPlace<=outlen){
        pos = posX + width/2 + auxPlace * 8;
        if(!posarr.includes("["+pos+","+posY+"]")){
          break;
        }
        pos = posX + width/2 + auxPlace2 * 8;
        if(!posarr.includes("["+pos+","+posY+"]")){
          break;
        }
        auxPlace = auxPlace +1;
        auxPlace2 = auxPlace2 -1;
      }
      if(pos != 0){
        posarr.push("["+ pos + "," + posY + "]");
        return pos;
      }
    }
    else{
      posarr.push("["+ posX + "," + posY + "]");
      return posX + width/2;
    }
  }
  
  function createBoxPlot(id) {
    const svg = d3
      .select(id)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("id", "gBoxChart")
      .attr("transform",
      `translate(${margin.left},${margin.top})`);
  
    d3.csv("data.csv").then(function (data) {
      // Compute quartiles, median, inter quantile range min and max --> these info are then used to draw the box.
      var maxlen = 0
      sumstat = d3.rollup(data, function(d) {
          q1 = d3.quantile(d.map(function(g) { return g.hp;}).sort(d3.ascending),.25)
          median = d3.quantile(d.map(function(g) { return g.hp;}).sort(d3.ascending),.5)
          q3 = d3.quantile(d.map(function(g) { return g.hp;}).sort(d3.ascending),.75)
          interQuantileRange = q3 - q1
          
          
          min = d3.min(Array.from(d.map(function(g){ return g.hp;})), s => +s);//tranform string in ints
          
          max = d3.max(Array.from(d.map(function(g){ return g.hp;})), s => +s);
          if(max > q3 + 1.5 * interQuantileRange){
            max = q3 + 1.5 * interQuantileRange;
          }
          var data_sorted = d.map(function(g){return g.hp;}).sort(d3.ascending);
          var outliars = data_sorted.filter((d) => d > max || d < min);
          if (outliars.length > maxlen){
            maxlen = outliars.length;
          }
  
          outliars.sort(function(a, b){return a - b});
          var ids = d.map(function(g){return g.id});
  
          return({q1: q1, median: median, q3: q3, interQuantileRange: interQuantileRange, min: min, max: max, outliers: outliars, ids: ids})
        }, d => d.types)
      
      // Show the X scale
      var x = d3.scaleBand()
        .rangeRound([ 0, width ])
        .domain(["Psychic", "Water", "Colorless", "Fire", "Fighting", "Lightning", "Grass", "Metal", "Darkness"])
        .padding(0.1)
        
      svg.append("g")
        .attr("id", "gXAxis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))
        .append("text")
        .style("text-anchor", "middle")
        .attr("x", 495)
        .text("types")
        .style("fill", "black")
  
      // Show the Y scale
      var y = d3.scaleLinear()
        .domain([0, 230])
        .range([height, 0])
      svg
        .append("g")
        .attr("id", "gYAxis")
        .call(d3.axisLeft(y))
        .append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text("hp")
        .style("fill", "black")
  
      // Show the main vertical line
      svg
        .selectAll("vertLines")
        .data(sumstat)
        .enter()
        .append("line")
          .attr("class", "boxValue bValue")
          .attr("x1", function(d){return(x(d[0])+x.bandwidth()/2);})
          .attr("x2", function(d){return(x(d[0])+x.bandwidth()/2);})
          .attr("y1", function(d){return(y(d[1].min))})
          .attr("y2", function(d){return(y(d[1].max))})
          .attr("stroke", "black")
          .style("width", 40)
  
      // rectangle for the main box
      svg
        .selectAll("boxes.boxValue")
        .data(sumstat)
        .enter()
        .append("rect")
            .attr("class", "boxValue bValue")
            .attr("x", function(d){return(x(d[0]))})
            .attr("y", function(d){return(y(d[1].q3))})
            .attr("height", function(d){return(y(d[1].q1)-y(d[1].q3));})
            .attr("width", function(){return x.bandwidth();} )
            .attr("stroke", "black")
            .style("fill", normalColor)
            .on("mouseover", (event, d) => handleMouseOver(d))
            .on("mouseleave", (event, d) => handleMouseLeave())
            .on("click", function(event, item){
              selectedType = findType(d3.select(this).attr("x"));
              
              updateParallelSets();
              updatePC();

              d3.selectAll(".bValue")
                .style("fill",normalColor);

              d3.selectAll(".bValue")
                .filter(function (d, i) {
                  return d[0] == item[0];
                })
                .style("fill",selectedColor);

            })
            .append("title")
            .text(function(d) { return "median - " + d[1].median; })
            
  
         // Show the median
      svg
        .selectAll("medians")
        .data(sumstat)
        .enter()
        .append("polygon")
          .attr("points", function (d, i) {
            let polygonString_1 = x(d[0])+x.bandwidth()/2 + "," + (y(d[1].median) - 10);
            let polygonString_2 = x(d[0])+x.bandwidth()/2 - 5 + "," + (y(d[1].median) + 10);
            let polygonString_3 = x(d[0])+x.bandwidth()/2 + 10 + "," + (y(d[1].median) - 2);
            let polygonString_4 = x(d[0])+x.bandwidth()/2 - 10 + "," + (y(d[1].median) - 2);
            let polygonString_5 = x(d[0])+x.bandwidth()/2 + 5 + "," + (y(d[1].median) + 10);
            let polygonString =
              polygonString_1 +
              " " +
              polygonString_2 +
              " " +
              polygonString_3 +
              " " +
              polygonString_4 +
              " " +
              polygonString_5;
            return polygonString;
          })
          .attr("stroke-width", "5")
          .attr("fill", mediansColor);      
  
        points = svg
          .selectAll("point.pointValues")
          .data(data)
          .enter()
          .append("circle")
            .attr("class", "pointValues pValue")
            .attr("cx", (d) => x(d.types) + x.bandwidth()/2)
            .attr("cy", (d) => y(d.hp))
            .attr("r", 4)
            .attr("fill","none");
  
        svg
          .selectAll("outlier.outlierValues")
          .data(data)
          .enter()
          .append("circle")
            .attr("class", "outlierValues oValue")
            .attr("cx", (d) => placeOutlier(d,sumstat,x.bandwidth(),x(d.types),d.hp))
            .attr("cy", (d) => y(d.hp))
            .attr("r", 3)
            .attr("fill",function(d){
              if(parseFloat(d.hp) >= parseFloat(sumstat.get(d.types)["outliers"][0])){
                return "currentColor";
              }
              else{
                return "none";
              }
            })
            .attr("fill-opacity", 0.2)
            .on("mouseover", (event, d) => handleMouseOver(d))
            .on("mouseleave", (event, d) => handleMouseLeave())
            .append("title")
            .text((d) => d.name);
  
        var average = 0;
        var i = 0;
        while(i < data.length){
          average = average + parseFloat(data[i].hp);
          i = i + 1;
        }
        average = average / i;
    
        //show the average hp
        svg
          .selectAll("average.averageValue")
          .data(data)
          .enter()
          .append("line")
            .attr("class", "averageValue aValue")
            .attr("x1", function(d){return(-10); })
            .attr("x2", function(d){return(width+20) })
            .attr("y1", function(d){return(y(average))})
            .attr("y2", function(d){return(y(average))})
            .attr("stroke", averageColor)
            .style("stroke-width", 1.5)
            .style("width", 80)
            .on("mouseover", (event, d) => handleMouseOverAverage(d))
            .on("mouseleave", (event, d) => handleMouseLeaveAverage())
            .append("title")
            .text("average hp");
    });
  }

  
function updateBoxPlot(){
    d3.csv("data.csv").then(function (data){
      data = data.filter(function (elem) {
        function expr(){
          if(selectedType != "none"){
            return elem.types == selectedType && attr[0][1] <= elem.level && elem.level <= attr[0][0] && attr[1][1] <= elem.hp && elem.hp <= attr[1][0] && attr[2][1] <= elem.damage && elem.damage <= attr[2][0]
            && attr[3][1] <= elem.energyCost && elem.energyCost <= attr[3][0];
          }
          else{
            return attr[0][1] <= elem.level && elem.level <= attr[0][0] && attr[1][1] <= elem.hp && elem.hp <= attr[1][0] && attr[2][1] <= elem.damage && elem.damage <= attr[2][0]
            && attr[3][1] <= elem.energyCost && elem.energyCost <= attr[3][0];
          }
        };
        return expr() && (cat1(elem) || cat2(elem));
      });
  
      var maxlen = 0
      sumstat = d3.rollup(data, function(d) {
          q1 = d3.quantile(d.map(function(g) { return g.hp;}).sort(d3.ascending),.25)
          median = d3.quantile(d.map(function(g) { return g.hp;}).sort(d3.ascending),.5)
          q3 = d3.quantile(d.map(function(g) { return g.hp;}).sort(d3.ascending),.75)
          interQuantileRange = q3 - q1
          
          min = d3.min(Array.from(d.map(function(g){ return g.hp;})), s => +s);//tranform string in ints
      
          max = d3.max(Array.from(d.map(function(g){ return g.hp;})), s => +s);
          if(max > q3 + 1.5 * interQuantileRange){
            max = q3 + 1.5 * interQuantileRange;
          }
          var data_sorted = d.map(function(g){return g.hp;}).sort(d3.ascending);
          var outliars = data_sorted.filter((d) => d > max || d < min);
          if (outliars.length > maxlen){
            maxlen = outliars.length;
          }
          outliars.sort(function(a, b){return a - b});
          var ids = d.map(function(g){return g.id});
          
          return({q1: q1, median: median, q3: q3, interQuantileRange: interQuantileRange, min: min, max: max, outliers: outliars, ids:ids})
        }, d => d.types)
      
      const svg = d3.select("#gBoxChart");
      svg.selectAll("*").remove();
      
      var x = d3.scaleBand()
        .rangeRound([ 0, width ])
        .domain(["Psychic", "Water", "Colorless", "Fire", "Fighting", "Lightning", "Grass", "Metal", "Darkness"])
        .padding(0.1)
      
      svg
        .append("g")
        .attr("id", "gXAxis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))
        .append("text")
        .style("text-anchor", "middle")
        .attr("x", 495)
        .text("types")
        .style("fill", "black")
  
      var y = d3.scaleLinear()
        .domain([0, 230])
        .range([height, 0])
      
      svg
        .append("g")
        .attr("id", "gYAxis")
        .call(d3.axisLeft(y))
        .append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text("hp")
        .style("fill", "black")
  
      
      svg
        .selectAll("vertLines")
        .data(sumstat)
        .enter()
        .append("line")
          .attr("x1", function(d){return(x(d[0])+x.bandwidth()/2);})
          .attr("x2", function(d){return(x(d[0])+x.bandwidth()/2);})
          .attr("y1", function(d){return(y(d[1].min))})
          .attr("y2", function(d){return(y(d[1].max))})
          .attr("stroke", "black")
          .style("width", 40)
  
    // rectangle for the main box
    svg
      .selectAll("boxes.boxValue")
      .data(sumstat)
      .enter()
      .append("rect")
          .attr("class", "boxValue bValue")
          .attr("x", function(d){return(x(d[0]))})
          .attr("y", function(d){return(y(d[1].q3))})
          .attr("height", function(d){
            return(y(d[1].q1)-y(d[1].q3));})
          .attr("width", function(){return x.bandwidth();} )
          .attr("stroke", "black")
          .style("fill", normalColor)
          .on("mouseover", (event, d) => handleMouseOver(d))
          .on("mouseleave", (event, d) => handleMouseLeave())
          .on("click", function(){
            selectedType = findType(d3.select(this).attr("x"));
      
            updateParallelSets();
            updatePC();

            d3.selectAll(".bValue")
            .style("fill",normalColor);

            d3.selectAll(".bValue")
              .filter(function (d, i) {
                return d[0] == item[0];
              })
              .style("fill",selectedColor);

          })
          .append("title")
          .text(function(d) { return "median - " + d[1].median; })
          
  
      // Show the median
      svg
      .selectAll("medians")
      .data(sumstat)
      .enter()
      .append("polygon")
        .attr("points", function (d, i) {
          let polygonString_1 = x(d[0])+x.bandwidth()/2 + "," + (y(d[1].median) - 10);
          let polygonString_2 = x(d[0])+x.bandwidth()/2 - 5 + "," + (y(d[1].median) + 10);
          let polygonString_3 = x(d[0])+x.bandwidth()/2 + 10 + "," + (y(d[1].median) - 2);
          let polygonString_4 = x(d[0])+x.bandwidth()/2 - 10 + "," + (y(d[1].median) - 2);
          let polygonString_5 = x(d[0])+x.bandwidth()/2 + 5 + "," + (y(d[1].median) + 10);
          let polygonString =
            polygonString_1 +
            " " +
            polygonString_2 +
            " " +
            polygonString_3 +
            " " +
            polygonString_4 +
            " " +
            polygonString_5;
          return polygonString;
        })
        .attr("stroke-width", "5")
        .attr("fill", mediansColor);
      
  
      points = svg
        .selectAll("point.pointValues")
        .data(data)
        .enter()
        .append("circle")
          .attr("class", "pointValues pValue")
          .attr("cx", (d) => x(d.types) + x.bandwidth()/2)
          .attr("cy", (d) => y(d.hp))
          .attr("r", 4)
          .attr("fill","none");
  
      posarr = [];
      svg
        .selectAll("outlier.outlierValues")
        .data(data)
        .enter()
        .append("circle")
          .attr("class", "outlierValues oValue")
          .attr("cx", (d) => placeOutlier(d,sumstat,x.bandwidth(),x(d.types),d.hp))
          .attr("cy", (d) => y(d.hp))
          .attr("r", 3)
          .attr("fill",function(d){
            if(parseFloat(d.hp) >= parseFloat(sumstat.get(d.types)["outliers"][0])){
              return "currentColor";
            }
            else{
              return "none";
            }
          })
          .attr("fill-opacity", 0.2)
          .on("mouseover", (event, d) => handleMouseOver(d))
          .on("mouseleave", (event, d) => handleMouseLeave())
          .append("title")
          .text((d) => d.name);
  
      var average = 0;
      var i = 0;
      while(i < data.length){
        average = average + parseFloat(data[i].hp);
        i = i + 1;
      }
      average = average / i;
  
      //show the average hp
      svg
        .selectAll("average.averageValue")
        .data(data)
        .enter()
        .append("line")
          .attr("class", "averageValue aValue")
          .attr("x1", function(d){return(-10); })
          .attr("x2", function(d){return(width+20) })
          .attr("y1", function(d){return(y(average))})
          .attr("y2", function(d){return(y(average))})
          .attr("stroke", averageColor)
          .style("stroke-width", 1.5)
          .style("width", 80)
          .on("mouseover", (event, d) => handleMouseOverAverage(d))
          .on("mouseleave", (event, d) => handleMouseLeaveAverage())
          .append("title")
          .text("average hp");
    });
  }