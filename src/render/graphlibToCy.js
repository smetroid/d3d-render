export function graphlibToCyElements(graphlibJson) {
  const elements = []
  for (const node of graphlibJson.nodes || []) {
    const data = { id: node.v, label: node.value?.label || node.v, ...node.value }
    if (node.parent != null) data.parent = node.parent
    elements.push({ group: 'nodes', data })
  }
  for (const edge of graphlibJson.edges || []) {
    elements.push({
      group: 'edges',
      data: {
        id: edge.value?.id || `${edge.v}->${edge.w}`,
        source: edge.v,
        target: edge.w,
        label: edge.value?.label || '',
        ...edge.value
      }
    })
  }
  return elements
}

export function validateGraphlib(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    const err = new Error('src must be a graphlib JSON object')
    err.statusCode = 400
    throw err
  }
  if (!Array.isArray(obj.nodes)) {
    const err = new Error('src missing nodes array')
    err.statusCode = 400
    throw err
  }
}
