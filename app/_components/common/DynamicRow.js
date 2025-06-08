import { memo, useEffect, useRef } from 'react'

const DynamicRow = ({
  data,
  index,
  setSize,
  windowWidth,
  renderItem
}) => {
  const rowRef = useRef(null)

  useEffect(() => {
    if (rowRef.current) {
      setSize(index, rowRef.current.getBoundingClientRect().height)
    }
  }, [setSize, index, windowWidth])

  const item = data[index]
  return <div ref={rowRef}>{renderItem(item)}</div>
}

export default memo(DynamicRow);