var cell = {
  EMPTY: '#000',
  ROOM: '#eee',
  BRIDGE: '#0ee',
  TREASURE: '#fa0',
  ENTRANCE: '#00f',
  EXIT: '#f00',
  MONSTER: '#f0f',
}

var MIN_ROOM_SIZE = 4

function createBspTree(width, height, depth) {
  var stack = [[0, 0, width, height, 1, 1]]
  var result = {}
  while (stack.length) {
    var node = stack.pop()
    var nx = node[0], ny = node[1], nw = node[2], nh = node[3], i = node[4], nd = node[5]
    result[i] = [nx, ny, nw, nh]
    if (nd >= depth) continue
    var isHorizontalSplit = Math.random() + 1 < (nh > nw ? nh / nw : nw / nh)
    if (nh <= nw) isHorizontalSplit = !isHorizontalSplit
    if (isHorizontalSplit && nh >= 2 * MIN_ROOM_SIZE) {
      var h = Math.floor(MIN_ROOM_SIZE + (nh / 2 - MIN_ROOM_SIZE) * Math.random())
      if (Math.random() > 0.5) h = nh - h
      stack.push([nx, ny, nw, h, 2 * i, nd + 1])
      stack.push([nx, ny + h, nw, nh - h, 2 * i + 1, nd + 1])
    } else if (!isHorizontalSplit && nw >= 2 * MIN_ROOM_SIZE) {
      var w = Math.floor(MIN_ROOM_SIZE + (nw / 2 - MIN_ROOM_SIZE) * Math.random())
      if (Math.random() > 0.5) w = nw - w
      stack.push([nx, ny, w, nh, 2 * i, nd + 1])
      stack.push([nx + w, ny, nw - w, nh, 2 * i + 1, nd + 1])
    }
  }
  return result
}

function markRooms(bsps, roomDensity) {
  var leafs = []
  for (var i in bsps) {
    var isLeaf = !bsps[2 * i] && !bsps[2 * i + 1]
    if (isLeaf && Math.random() < roomDensity) {
      bsps[i][4] = true
      leafs.push(i)
    }
  }
  return leafs
}

function fillRoom(br, bsps, index, treasureDensity, enemyDensity) {
  var c = bsps[index]
  var ox = Math.round(Math.random() * 2) + c[0]
  var oy = Math.round(Math.random() * 2) + c[1]
  var ow = c[2] - 2
  var oh = c[3] - 2
  var board = br[0], rooms = br[1]
  for (var j = 0; j < oh; j++) {
    for (var i = 0; i < ow; i++) {
      board[oy + j][ox + i] = cell.ROOM
      rooms[oy + j][ox + i] = index
    }
  }
  var possibleEnemies = Math.floor((oh * ow) / 10)
  for (var i = 0; i < possibleEnemies; i++) {
    if (Math.random() < enemyDensity) {
      var ty = oy + Math.floor(Math.random() * oh)
      var tx = ox + Math.floor(Math.random() * ow)
      board[ty][tx] = cell.MONSTER
    }
  }
  if (Math.random() < treasureDensity) {
    var ty = oy + Math.floor(Math.random() * oh)
    var tx = ox + Math.floor(Math.random() * ow)
    board[ty][tx] = cell.TREASURE
    return [tx, ty]
  }
}

function createBoard(bsps) {
  var width = bsps[1][2], height = bsps[1][3]
  var board = []
  var rooms = []
  for (var j = 0; j < height; j++) {
    var row = []
    var row2 = []
    for (var i = 0; i < width; i++) {
      row.push(cell.EMPTY)
      row2.push(0)
    }
    board.push(row)
    rooms.push(row2)
  }
  return [board, rooms]
}

function fillBridgeHalf(board, a, b) {
  var ax = a[0], ay = a[1], aw = a[2], ah = a[3]
  var bx = b[0], by = b[1], bw = b[2], bh = b[3]
  if (ax === bx) {
    var cx = ax + Math.floor(aw / 2)
    var cy = Math.floor((ah + bh) / 2) + Math.min(ay, by)
    var sy = ay + Math.floor(ah / 2)
    for (var i = Math.min(cy, sy); i <= Math.max(cy, sy); i++)
      board[i][cx] = cell.BRIDGE
  } else {
    var cy = ay + Math.floor(ah / 2)
    var cx = Math.floor((aw + bw) / 2) + Math.min(ax, bx)
    var sx = ax + Math.floor(aw / 2)
    for (var i = Math.min(cx, sx); i <= Math.max(cx, sx); i++)
      board[cy][i] = cell.BRIDGE
  }
}

function findPierceParent(board, i, j) {
  var parent = [0, 0]
  var adj = 0
  var mks = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  for (var mm = 0; mm < 4; mm++) {
    var m = mks[mm][0], k = mks[mm][1]
    var c = (board[j + m] || [])[i + k]
    if (c !== cell.EMPTY) {
      adj++
      parent = [i + k, j + m]
    }
  }
  return parent.concat([adj])
}

function findFarthestCell(root, board) {
  var visited = {}
  var queue = [root]
  var last = null
  while (queue.length) {
    var node = queue.shift()
    var nx = node[0], ny = node[1]
    var c = (board[ny] || [])[nx]
    if (node.join() in visited || c === cell.EMPTY || !c) continue
    visited[node.join()] = 1
    if (c === cell.ROOM) last = node
    queue.push([nx + 1, ny])
    queue.push([nx - 1, ny])
    queue.push([nx, ny + 1])
    queue.push([nx, ny - 1])
  }
  return last
}

function deletePierces(board) {
  var last = null
  for (var j = 0; j < board.length; j++) {
    for (var i = 0; i < board[j].length; i++) {
      var c = board[j][i]
      if (c === cell.ROOM) last = [i, j]
      if (c !== cell.BRIDGE) continue
      var k = i
      var m = j
      var xya = findPierceParent(board, i, j)
      while (true) {
        if (board[m][k] !== cell.BRIDGE || xya[2] > 1) break
        board[m][k] = cell.EMPTY
        m = xya[1]
        k = xya[0]
        xya = findPierceParent(board, k, m)
      }
    }
  }
  return last
}

function generateLevel(bsps, roomDensity, treasureDensity, enemyDensity) {
  var leafs = markRooms(bsps, roomDensity)
  var filled = leafs.slice()
  var br = createBoard(bsps)
  var board = br[0], rooms = br[1]
  while (filled.length) {
    var i = filled.pop()
    if (i == 1) continue
    var c = bsps[i]
    var sibling = bsps[i % 2 ? i - 1 : +i + 1]
    var parent = (i % 2 ? i - 1 : i) / 2
    filled.push(parent)
    fillBridgeHalf(board, c, sibling)
  }
  var treasures = {}
  for (var i = 0; i < leafs.length; i++) {
    var treasure = fillRoom(br, bsps, leafs[i], treasureDensity, enemyDensity)
    if (treasure) treasures[treasure.join()] = treasure
  }
  var root = deletePierces(board)
  if (!root) return board
  var entrance = findFarthestCell(root, board)
  var exit = findFarthestCell(entrance, board)
  var indeces = [rooms[entrance[1]][entrance[0]], rooms[exit[1]][exit[0]]]
  for (var key in treasures) {
    var t = treasures[key]
    if (~indeces.indexOf(rooms[t[1]][t[0]])) board[t[1]][t[0]] = cell.ROOM
  }
  board[entrance[1]][entrance[0]] = cell.ENTRANCE
  board[exit[1]][exit[0]] = cell.EXIT
  return board
}