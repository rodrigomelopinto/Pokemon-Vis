const margin = { top: 20, right: 30, bottom: 40, left: 90 };
const width = 600 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;
const brushHeight = 40;
var posarr = [];
var points;
var sMap = {};
var attr = [[90,0], [200,0], [170,0], [5.0, 0]];
var flag = 0;
var selectedType = "none";

var selectedCat1 = [];
var dimOrder1 = ["evolution","rarity","resistances","types","weaknesses"];
var selIds1 = [];
var selectedCat2 = [];
var dimOrder2 = ["evolution","rarity","resistances","types","weaknesses"];
var selIds2 = [];
var ribbon;

var dimensionOrder = ["evolution","rarity","resistances","types","weaknesses"];

var overColor = "#C12922";
var mediansColor = "#7922C1"
var normalColor = "#22BAC1";
var selectedColor = "yellow";
var deselectedColor = "#ddd";
var averageColor = "green";
var sumstat;
var searchWrapper = document.querySelector(".search-input");
var inputBox = searchWrapper.querySelector("input");
var suggBox = searchWrapper.querySelector(".autocom-box");

inputBox.onkeyup = (e)=>{
  let userData = e.target.value;
  let emptyArray = [];
  if(userData){
    emptyArray = suggestions.filter((data)=>{
        return data.toLocaleLowerCase().startsWith(userData.toLocaleLowerCase());
    });
    emptyArray = emptyArray.map((data)=>{
      return data = '<li>' + data + '</li>';
    });
    searchWrapper.classList.add("active");
    showSuggestions(emptyArray);
    let allList = suggBox.querySelectorAll("li");
    for (let i=0;i<allList.length;i++){
      allList[i].setAttribute("onclick", "select(this)");
    }
  }
  else{
    searchWrapper.classList.remove("active");
  }
  
}

function select(element){
  let selectUserData =  element.textContent;
  inputBox.value = selectUserData;
  searchWrapper.classList.remove("active");
}

function showSuggestions(list){
  let listData;
  if(!list.length){
    userValue = inputBox.value;
    listData = '<li>' + userValue + '</li>';
  }
  else{
    listData = list.join('');
  }
  suggBox.innerHTML = listData;
}


function init() {
  createBoxPlot("#vi1");
  createParallelSets("#vi2");
  createParallelCoordinates("#vi3");
}

function handleMouseOverAverage(){
  d3.selectAll(".aValue")
    .style("stroke-width", 5)
    .style("stroke", overColor);
}

function handleMouseLeaveAverage(){
  d3.selectAll(".aValue")
    .style("stroke-width", 1.5)
    .style("stroke", averageColor);
}

function handleMouseOver(item) {
  d3.selectAll(".itemValue")
    .filter(function (d, i) {
      if(item[1] == undefined){
        return d.id == item.id
      }
      else{
        return item[1].ids.includes(d.id);
      }
    })
    .style("stroke-width", 2)
    .style("stroke", overColor);
  
  d3.selectAll(".pValue")
    .filter(function (d, i) {
      return d.id == item.id;
    })
    .style("stroke-width",function(d){
      if(parseFloat(d.hp) >= parseFloat(sumstat.get(d.types)["outliers"][0])){
        return "none";
      }
      else{
        return 5;
      }
    })
    .style("stroke",function(d){
      if(parseFloat(d.hp) >= parseFloat(sumstat.get(d.types)["outliers"][0])){
        return "none";
      }
      else{
        return overColor;
      }
    })
    .style("fill",function(d){
      if(parseFloat(d.hp) >= parseFloat(sumstat.get(d.types)["outliers"][0])){
        return "none";
      }
      else{
        return overColor;
      }
    });

  d3.selectAll(".oValue")
  .filter(function (d, i) {
    return d.id == item.id;
  })
  .style("stroke-width", function(d){if(parseFloat(d.hp) >= parseFloat(sumstat.get(d.types)["outliers"][0])){
    return 5;
  }
  else{
    return "none";
  }})
  .style("stroke", function(d){
    if(parseFloat(d.hp) >= parseFloat(sumstat.get(d.types)["outliers"][0])){
      return overColor;
    }
    else{
      return "none";
    }
  })
  .style("fill", function(d){
    if(parseFloat(d.hp) >= parseFloat(sumstat.get(d.types)["outliers"][0])){
      return overColor;
    }
    else{
      return "none";
    }
  });

  d3.selectAll(".bValue")
    .filter(function (d, i) {
      return d[0] == item[0];
    })
    .style("fill",overColor);
}

function handleMouseLeave() {
  d3.selectAll(".itemValue")
    .style("stroke-width", 1)
    .style("stroke",function(){
      if(sMap[this.getAttribute('d')] == 1){
        return normalColor;
      }
      else if(flag == 0){
        return normalColor;
      }
      else{
        return deselectedColor;
      }
    });

  d3.selectAll(".pValue")
    .style("stroke-width", 1)
    .style("stroke", "none")
    .style("fill", "none");
  
  d3.selectAll(".oValue")
    .style("stroke", "none")
    .style("fill", function(d){
      if(parseFloat(d.hp) >= parseFloat(sumstat.get(d.types)["outliers"][0])){
        return "currentColor";
      }
      else{
        return "none";
      }})
    .attr("fill-opacity", 0.2);

  d3.selectAll(".bValue")
    .style("fill",function(){
      if(this.style.fill == selectedColor){
        return selectedColor;
      }
      else{
        return normalColor;
      }
    });
}

function cat1(elem){
  if(selectedCat1.length == 1){
    if(elem[dimOrder1[0]] == selectedCat1[0]){
      selIds1.push(elem.id);
      return true;
    }
    else{
      return false;
    }
  }
  if(selectedCat1.length == 2){
    if(elem[dimOrder1[0]] == selectedCat1[0] && elem[dimOrder1[1]] == selectedCat1[1]){
      selIds1.push(elem.id);
      return true;
    }
    else{
      return false;
    }
  }
  if(selectedCat1.length == 3){
    if(elem[dimOrder1[0]] == selectedCat1[0] && elem[dimOrder1[1]] == selectedCat1[1] && elem[dimOrder1[2]] == selectedCat1[2]){
      selIds1.push(elem.id);
      return true;
    }
    else{
      return false;
    }
  }
  if(selectedCat1.length == 4){
    if(elem[dimOrder1[0]] == selectedCat1[0] && elem[dimOrder1[1]] == selectedCat1[1] && elem[dimOrder1[2]] == selectedCat1[2] && elem[dimOrder1[3]] == selectedCat1[3]){
      selIds1.push(elem.id);
      return true;
    }
    else{
      return false;
    }
  }
  if(selectedCat1.length == 5){
    if(elem[dimOrder1[0]] == selectedCat1[0] && elem[dimOrder1[1]] == selectedCat1[1] && elem[dimOrder1[2]] == selectedCat1[2] && elem[dimOrder1[3]] == selectedCat1[3] && elem[dimOrder1[4]] == selectedCat1[4]){
      selIds1.push(elem.id);
      return true;
    }
    else{
      return false;
    }
  }
  return true;
}

function cat2(elem){
  if(selectedCat2.length == 1){
    if(elem[dimOrder2[0]] == selectedCat2[0]){
      selIds2.push(elem.id);
      return true;
    }
    else{
      return false;
    }
  }
  if(selectedCat2.length == 2){
    if(elem[dimOrder2[0]] == selectedCat2[0] && elem[dimOrder2[1]] == selectedCat2[1]){
      selIds2.push(elem.id);
      return true;
    }
    else{
      return false;
    }
  }
  if(selectedCat2.length == 3){
    if(elem[dimOrder2[0]] == selectedCat2[0] && elem[dimOrder2[1]] == selectedCat2[1] && elem[dimOrder2[2]] == selectedCat2[2]){
      selIds2.push(elem.id);
      return true;
    }
    else{
      return false;
    }
  }
  if(selectedCat2.length == 4){
    if(elem[dimOrder2[0]] == selectedCat2[0] && elem[dimOrder2[1]] == selectedCat2[1] && elem[dimOrder2[2]] == selectedCat2[2] && elem[dimOrder2[3]] == selectedCat2[3]){
      selIds2.push(elem.id);
      return true;
    }
    else{
      return false;
    }
  }
  if(selectedCat2.length == 5){
    if(elem[dimOrder2[0]] == selectedCat2[0] && elem[dimOrder2[1]] == selectedCat2[1] && elem[dimOrder2[2]] == selectedCat2[2] && elem[dimOrder2[3]] == selectedCat2[3] && elem[dimOrder2[4]] == selectedCat2[4]){
      selIds2.push(elem.id);
      return true;
    }
    else{
      return false;
    }
  }
  return false;
}

function findType(x) {
  if(x == 9){
    return "Psychic";
  }
  if(x == 61){
    return "Water";
  }
  if(x == 113){
    return "Colorless";
  }
  if(x == 165){
    return "Fire";
  }
  if(x == 217){
    return "Fighting";
  }
  if(x == 269){
    return "Lightning";
  }
  if(x == 321){
    return "Grass";
  }
  if(x == 373){
    return "Metal";
  }
  if(x == 425){
    return "Darkness";
  }
}