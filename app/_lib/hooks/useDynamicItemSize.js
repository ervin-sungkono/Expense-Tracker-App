import { useCallback, useRef } from 'react'

const useDynamicItemSize = () => {
  const listRef = useRef(null)
  const sizeMap = useRef({})

  const setSize = useCallback((index, size) => {
    sizeMap.current = { ...sizeMap.current, [index]: size }
    if (listRef.current) {
      listRef.current.resetAfterIndex(index)
    }
  }, [])

  const getSize = (index) => sizeMap.current[index] || 50

  const resetAfterIndex = (index, shouldForceUpdate = true) => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(index, shouldForceUpdate)
    }
  }

  return {
    listRef,
    setSize,
    getSize,
    resetAfterIndex,
  }
}

export default useDynamicItemSize