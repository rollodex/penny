var State = {
  user: { value: "", watchers: [] },  //web3.eth.addresses[0]
  id: { value: 0, watchers: [] }, //metamask change
  auctions: {value: [], watchers: []},
  target: {value: 0, watchers:[]}
};


var WC = {
 auction: {mainnet:"",metis:"0x721E40573191deCF1c6b4fb78a7904d02d87D96C",instance:undefined},
 mint: {mainnet:"",metis:"0x5648912d6e2Ac50cf31107048C0C0dB94e43f3Da",instance:undefined}
}

function On(key, watcher) {
  State[key].watchers.push(watcher);
}

function Transition(route) {
  if (location.hash == "")
    route = 'hq'
  console.log("Route: " + route)

  TransitionTable[route].updater();
  TransitionTable[route].loader();
}

function UpdateState(key, value) {
  if (State[key].value === value) return;
  if (!(State[key].value instanceof Array)) {
    console.log("Not array");
    State[key].value = value;
    for (w in State[key].watchers) {
      State[key].watchers[w](value);
    }
  } else {
      console.log("Array");
      State[key].value.push(value);
      for (w in State[key].watchers) {
        State[key].watchers[w](value);
      }

  }
}

var TransitionTable = {
  hq: {
    loader: function () {
      $('[name="dashboard"]').removeClass('active');
      $('[name="auctions"]').removeClass('active');
      $('[name="hq"]').addClass('active');
      $("#current").html(document.getElementById("hq").innerHTML);
    },
    updater: function() {}
  },

  auctions: {
    loader: function () {
      $('[name="hq"]').removeClass('active');
      $('[name="dashboard"]').removeClass('active');
      $('[name="auctions"]').addClass('active');
     $("#current").html(document.getElementById("auctions").innerHTML);
    },
    updater: function() { $('#auction-grid').empty();State.auctions.value = [];loadAuctions() }
  },
  auction: {
    loader: function () {
     $("#current").html(document.getElementById("auction").innerHTML);
     $('[name="hq"]').removeClass('active');
     $('[name="dashboard"]').removeClass('active');
     $('[name="auctions"]').addClass('active');
     WC.auction.instance.methods.auctions(State.target.value).call().then( (auction) => {
          var bid = auction.currentBid;
          $('#current-bid').text(parseFloat(web3.utils.fromWei(bid)));
          //emitRow2(auction);
          $("#bid-history").empty();$('#bid-history').append('<tr id="placeholder"><th>Block</th><th>Bid</th><th>Address</th></tr>');loadBids();
    })
    },
    updater: function() { loadAuctions(); $("#bid-history").empty();$('#bid-history').append('<tr id="placeholder"><th>Block</th><th>Bid</th><th>Address</th></tr>'); }
  },
  dashboard: {
    loader: function () {
      $('[name="hq"]').removeClass('active');
      $('[name="auctions"]').removeClass('active');
      $('[name="dashboard"]').addClass('active');
      $("#current").html(document.getElementById("dashboard").innerHTML);
    },
    updater: function() {$('#nft-grid').empty();$('#won-grid').empty();$('#expired-grid').empty(); loadNFTs();loadAuctions(); }
  }
}

$(window).on("hashchange", function() {
  doNav()
});

function doNav() {
  if (location.hash == "") {
    Transition("hq");
  } else {
    console.log('hash: ' + location.hash)
    let route = location.hash.slice(1);
    let subroute = route.split('/');
    route = subroute[0];
    path = subroute[1];
    if (path != '')
       UpdateState('target',path)
    Transition(route)
  }

}

function makeContract(name,abi) {
  var id = State["id"].value;
  console.log("ID: " + id);
  var network = ''

  switch (id) {
    case 1:
      network = 'mainnet';
      break;

    case 4:
      network = 'rinkeby';
      break;

    case 42:
      network = 'kovan';
      break;

    case 588:
      network = 'metis';
      break;

  }

  var entry = WC[name];
  var address = entry[network];

  var instance = new web3.eth.Contract(abi,address);
  WC[name].instance = instance;

}

window.addEventListener("load", async () => {
  feather.replace();

  window.odometerOptions = {

  format: 'd.dd', // Change how digit groups are formatted, and how many digits are shown after the decimal point

}

  if (window.ethereum) {
    await ethereum.enable();
    window.web3 = new Web3(ethereum);
  } else if (window.web3) {
    // Then backup the good old injected Web3, sometimes it's usefull:
    window.web3old = window.web3;
    // And replace the old injected version by the latest build of Web3.js version 1.0.0
    window.web3 = new Web3(window.web3.currentProvider);
  }

  startApp();
});

function startApp() {
  var netId = web3.eth.net.getId().then( (id) =>  {
      console.log("Network Id: " + id);
      if (id == 1 ) {
        //$('#network-alert').removeAttr("hidden");
      }
      UpdateState("id", id);
      window.web3.eth.getAccounts((error, accounts) => {
         UpdateState("user", accounts[0]);

         makeContract('auction',window.auctionHouseABI);
         makeContract('mint', window.mintABI);
         //Set up events:
         web3.eth.getBlockNumber((num) => {
           doNav();

           WC.auction.instance.events.BidPlaced({fromBlock:num}, function(error, event){
             console.log('event: ' + event);
             //emitRow2(event);
             var aID = event.returnValues.auction_id;

             WC.auction.instance.methods.auctions(aID).call().then(function (auction) {
               var aIX = State.auctions.value.findIndex(x => x.id == auction.id);
               State.auctions.value[aIX] = auction;
               updateBid(auction.auctionId);
             })
           })

         })
     })
   })

   On('auctions', function(v) {
     console.log("Auction: " + v.auctionId);
     var factory = WC.auction.instance;

     factory.methods.auctionActive(v.auctionId).call().then ( (r) => {
       if (r == true) {
         var time = getTimeLeft(v.endTime);
         if (time != 'expired') {
            $('#auction-grid').append('<div onclick="loadAuction(' + v.auctionId + ')" id="card-' + v.auctionId+'" class="w-full sm:w-1/2 h-64 mb-4 bg-white card  flex-grow-0 m-2 max-w-sm"><div id="image-'+v.auctionId+'" style="background-size: contain;background-position:center;background-repeat:no-repeat;" class="h-40 border-b border-gray-light"></div><div class="py-2 border-b border-gray-light font-sans text-base font-bold"><center id="title-'+ v.auctionId +'"></center></div><div class="py-4 px-2 text-sm font-sans font-hairline"><div><span class="inline" data-feather="clock"></span><span class="" id="time-'+ v.auctionId +'"></span><div class="float-right inline-block "><span class="odometer odometer-digit odometer-auto-theme odometer-value odometer-digit-inner">M</span> <span id="whole-'+v.auctionId+'" class="odometer odometerw'+ v.auctionId +'">0</span><span class="odometer odometer-digit odometer-auto-theme odometer-value odometer-digit-inner">.</span><span class ="odometer odometer-digit odometer-auto-theme odometer-value odometer-digit-inner" id="leading-'+v.auctionId+'">00</span><span id="bid-'+v.auctionId+'" class="odometer odometerf' + v.auctionId +'""></span></div></div></div></div>')
            feather.replace();
            doLookup(v.auctionId,v.tokenContract,v.itemId);
            updateBid(v.auctionId);

            var el1 = document.querySelector('.odometerw'+v.auctionId);
            var el2 = document.querySelector('.odometerf'+v.auctionId);

            od1 = new Odometer({
            el: el1,
            // Any option (other than auto and selector) can be passed in here
           format: 'd',

            });

            od2 = new Odometer({
            el: el2,
            // Any option (other than auto and selector) can be passed in here
           format: 'd',

            });

          updateOdo(v.auctionId,v.currentBid);
           setInterval ( () => {
               updateTimer(v.auctionId);
               updateTarget();
             },1000)
        } else {
          //Add to winner's dashboard
          if(v.bidCount > 0) {
               if(v.highBidder == State.user.value) {
                   $('#won-grid').append('<div class="w-full sm:w-1/6 h-50 mb-4 flex-grow-0 m-2 max-w-sm"><div id="card" class="bg-white card"><div class="m-2"><div id="image" style="background-size: contain;background-position:center;background-repeat:no-repeat;background-image:url(\'https://via.placeholder.com/384x160/FFFFFF/000000/?text=TEST%20NFT\')" class="h-40 border-b border-gray-light"></div></div><div class="py-2 border-b border-gray-light font-sans text-base font-bold"><center id="title">' + "Test NFT #" + v.itemId +'</center></div></div><button onclick="doClaim(' + v.auctionId +')" type="button" id=""  class="w-full mt-2 mb-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded inline items-center">Claim</button></div>');
               }
          } else {
            //Add to auctioneer's dashboard
            if(v.auctioneer == State.user.value) {
               $('#expired-grid').append('<div class="w-full sm:w-1/6 h-50 mb-4 flex-grow-0 m-2 max-w-sm"><div id="card" class="bg-white card"><div class="m-2"><div id="image" style="background-size: contain;background-position:center;background-repeat:no-repeat;background-image:url(\'https://via.placeholder.com/384x160/FFFFFF/000000/?text=TEST%20NFT\')" class="h-40 border-b border-gray-light"></div></div><div class="py-2 border-b border-gray-light font-sans text-base font-bold"><center id="title">' + "Test NFT #" + v.itemId +'</center></div></div><button onclick="doClaim(' + v.auctionId +')" type="button" id=""  class="w-full mt-2 mb-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded inline items-center">Claim</button></div>');
            }
          }
        }
       }
     })
  });
}

function updateMetamask(data) {
  console.log("Update User: " + data.selectedAddress);
  console.log("Update Network: "  + data.networkVersion)
  UpdateState("user", data.selectedAddress);

}

function loadAuctions() {
  var factory = WC.auction.instance;

  factory.methods.auctionCount().call().then(function (count) {
  var loop = count - 1;

  while(loop >= 0) {
        factory.methods.auctions(loop).call().then(function (address) {
          UpdateState('auctions',address);
        })
        loop--;
      }

    })

}

function loadBids() {
  WC.auction.instance.getPastEvents("BidPlaced", {fromBlock:0,toBlock:'latest'}, function(error,events) {
    for (v in events.reverse()) {
      emitRow(events[v])
    }
  })
}


function updateOdo(id,count) {
   var num = count //web3.utils.toWei(count.toString())
  console.log(num)
  var digits = num.toString().length - 1
  console.log(digits)

  if (digits > 17) {

    whole = num.toString().substring(0,digits-17)
    console.log('Set whole: ' + whole)
    $('#whole-' + id).text(whole);
    num = num.toString().substring(digits-17)
    num = num.replace(/^0+/, "");
    console.log('num: ' + num)
  }

  var display = parseInt(num.toString().replace(/[0|\D]+$/, ''))
  var digits = num.toString().length - 1
  var zero = '0'
  var leading = (!isNaN(display)) ? zero.repeat(17-digits) : '00'
   if ($('#card-' + id)[0] == undefined)
      return;

  if ($('#card-' + id)[0].hasAttribute("skipDigit")) {
    display *= 10

    $('#card-' + id).removeAttr('skipDigit')
  }

  if (display % 10 == 9)
    $('#card-' + id).attr('skipDigit','')

  console.log('display: ' + display)

  if (!isNaN(display)) {
  $('#bid-' + id).text(display)
  }
  $('#leading-' + id).text(leading)

}

function getTime() {
  return parseInt(Date.now() / 1000)
}

function getTimeLeft(timestamp) {

  return (getTime() >= parseInt(timestamp)) ? 'expired' : parseInt(timestamp) - getTime()
}

function updateTimer(id) {
  var auction = State.auctions.value.find(x => x.auctionId == id)
  if (auction == undefined)
    return;

  var time = getTimeLeft(auction.endTime);
  if (time != 'expired')
    time = new Date(time * 1000).toISOString().substr(11, 8)
  $('#time-' + id).text(time);
}

function updateBid(id) {
   var auction = State.auctions.value.find(x => x.auctionId == id)

   var bid = auction.currentBid;
   updateOdo(id,bid)

}

function updateTarget() {
  var auction = State.auctions.value.find(x => x.auctionId == State.target.value)

  if(auction == undefined)
     return;

  var time = getTimeLeft(auction.endTime);
  if (time != 'expired')
    time = new Date(time * 1000).toISOString().substr(11, 8)
  $('#current-timer').text(time);

  //$('#current-bid').text(web3.utils.fromWei(auction.currentBid));
  $('#current-title').text('Test NFT #' + auction.itemId);
}

async function doLookup(id,addy, ident) {
  var URL = 'https://api.opensea.io/api/v1/asset/'

    URL = URL + addy + '/' + ident;
    const myHeaders = new Headers({'X-API-KEY':'1a6aaeab958148a3a42d1d801912c91f'});
    const response = await fetch(URL,{headers:myHeaders});

     if (response.ok) {
       const assetJson = await response.json();
       var name = assetJson.name;
       var img = assetJson.image_original_url;

       $('#title-' + id).text(name)
       $('#image-' + id).css('background-image','url(\'' + img + '\')')

   } else {
       var img = 'https://via.placeholder.com/384x160/FFFFFF/000000/?text=TEST%20NFT'
       $('#title-' + id).text('Test NFT #' + ident)
       $('#image-' + id).css('background-image','url(\'' + img + '\')')
   }

}

function loadNFTs() {
  //Get NFT count
  var theMint = WC.mint.instance; //loadMint(mintAddress);
  theMint.methods.nftCount().call().then( (count) => {
    //alert(count);

    for (var i = 0; i < count; i++) {
        let value = i;
      theMint.methods.ownerOf(value).call().then ((address) =>{
        if (State.user.value == address) {
          emitNFT(value);
        }
      })
    }

  })

}

function emitNFT(id) {
  $('#nft-grid').append('<div class="w-full sm:w-1/6 h-50 mb-4 flex-grow-0 m-2 max-w-sm"><div id="card" class="bg-white card"><div class="m-2"><div id="image" style="background-size: contain;background-position:center;background-repeat:no-repeat;background-image:url(\'https://via.placeholder.com/384x160/FFFFFF/000000/?text=TEST%20NFT\')" class="h-40 border-b border-gray-light"></div></div><div class="py-2 border-b border-gray-light font-sans text-base font-bold"><center id="title">' + "Test NFT #" + id +'</center></div></div><button onclick="doListing(' + id +')" type="button" id=""  class="w-full mt-2 mb-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded inline items-center">List</button></div>');
}

function doMint() {

  var theMint = WC.mint.instance;

    theMint.methods
      .mintNFT()
      .send({ from: State.user.value })
      .then(function() {
        console.log("Minted");
        loadNFTs();
      });
}

function doListing(id) {
  var nft = WC.mint.instance;
  var ah = WC.auction.instance;

  nft.methods.approve(WC.auction.metis,id).send({ from: State.user.value }).then(() => {
    //List auction
    ah.methods.createAuction(WC.mint.metis,'0x0000000000000000000000000000000000000000',id,1,10000000000000000).send({ from: State.user.value }).then ((results) =>{
      ah.methods.startAuction(results.events.AuctionListed.returnValues['auction_id']).send({ from: State.user.value }).then(() => {
        $('#nft-grid').empty();
        $('#won-grid').empty();
        $('#expired-grid').empty();
        loadNFTs();
        loadAuctions();
        alert("Auction Started")
      })
    })
  })

}

function doBid() {
  var factory = WC.auction.instance;

    factory.methods.auctions(State.target.value).call().then( (auction) => {
      var bid = auction.currentBid;

      factory.methods.bid(State.target.value).send({ from: State.user.value, value: bid }).then ( () => {
        console.log("bid placed")

         factory.methods.auctions(State.target.value).call().then( (auction) => {
              var bid = auction.currentBid;
              $('#current-bid').text(parseFloat(web3.utils.fromWei(bid)));
              //emitRow2(auction);
              $("#bid-history").empty();$('#bid-history').append('<tr id="placeholder"><th>Block</th><th>Bid</th><th>Address</th></tr>');loadBids();
        })
      })
    });
}

function emitRow(v) {
  if(v.returnValues.auction_id == State.target.value) {
    $('#bid-history').append('<tr class="text-center"><td>'+ v.blockNumber +'</td><td>' + web3.utils.fromWei(v.returnValues.price)+ '</td><td>' +v.returnValues.bidder+'</td></tr>')
  }
}

function emitRow2(v) {
  if(v.returnValues.auction_id == State.target.value) {
    $('#placeholder').after('<tr class="text-center"><td>'+ v.blockNumber +'</td><td>' + web3.utils.fromWei(v.returnValues.price)+ '</td><td>' +v.returnValues.bidder+'</td></tr>')
  }
}

function loadAuction(id) {

  window.location.href = '#auction/' + id;
}

function browseAuctions() {
  window.location.href = '#auctions'
}

function doClaim(id) {
  var ah = WC.auction.instance;
  ah.methods.claim(id).send( { from: State.user.value} ).then ( () => {

    $('#nft-grid').empty();
    $('#won-grid').empty();
    $('#expired-grid').empty();
    loadNFTs();
    loadAuctions();
  })

}
