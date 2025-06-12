'use client'
import { memo } from 'react';
import { FixedSizeGrid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import InfiniteLoader from 'react-window-infinite-loader';
import ShopCard from './ShopCard';
import LoadingSpinner from '../common/LoadingSpinner';
import Image from 'next/image';

const COLUMN_CNT = 2;

const Row = ({ columnIndex, rowIndex, style, data }) => {
  const index = rowIndex * COLUMN_CNT + columnIndex;

  if(index >= data.length) return; // if the index is more than available data, it is not a valid index

  const item = data[rowIndex * COLUMN_CNT + columnIndex]; // load the item from data
  if(!item) return <div style={style} className='flex justify-center items-center animate-pulse'><p>Loading more data..</p></div>
  
  return (
      <ShopCard shop={item} isOdd={index % 2 === 1} style={style}/>
  );
};

const MemoizedRow = memo(Row);

const VirtualizedShopList = ({ items, loadMore, hasNextPage }) => {
  const isItemLoaded = index => !hasNextPage || index < items.length;

  if(!items) {
    return (
      <div className='w-full h-full px-4 py-2.5 flex flex-col gap-4 justify-center items-center text-center'>
        <LoadingSpinner/>
        <p className='text-dark/80 dark:text-white/80 text-sm md:text-base'>Loading shop data..</p>
      </div>
    )
  }
  if(items.length === 0 && !hasNextPage) {
    return(
      <div className='w-full h-full flex flex-col justify-center items-center text-center gap-2 rounded-lg px-4 py-2.5'>
        <div className='relative w-full aspect-[16/10]'>
          <Image fill src={'/not-found.png'} alt='' className='object-contain opacity-60 saturate-0'/>
        </div>
        <p className='text-dark/80 dark:text-white/80 text-sm md:text-base'>No shop found..</p>
      </div>
    )
  }
  return (
    <AutoSizer>
      {({ width, height }) => (
        <InfiniteLoader
          itemCount={hasNextPage ? items.length + 1 : items.length}
          loadMoreItems={loadMore}
          isItemLoaded={isItemLoaded}
        >
           {({ onItemsRendered, ref }) => (
              <FixedSizeGrid
                rowHeight={200}
                rowCount={Math.ceil(items.length / COLUMN_CNT)}
                columnWidth={width / COLUMN_CNT}
                columnCount={COLUMN_CNT}
                height={height}
                width={width}
                itemData={items}
                style={{willChange: 'initial'}}
                ref={ref}
                onItemsRendered={(props) => onItemsRendered({
                  overscanStartIndex: props.overscanRowStartIndex * COLUMN_CNT + props.overscanColumnStartIndex, 
                  overscanStopIndex: props.overscanRowStopIndex * COLUMN_CNT + props.overscanColumnStopIndex, 
                  visibleStartIndex: props.visibleRowStartIndex * COLUMN_CNT + props.visibleColumnStartIndex, 
                  visibleStopIndex: props.visibleRowStopIndex * COLUMN_CNT + props.visibleColumnStopIndex
                })}
              >
                {MemoizedRow}
              </FixedSizeGrid>
           )}
        </InfiniteLoader>
      )}
    </AutoSizer>
  )
};

export default VirtualizedShopList;