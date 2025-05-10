'use client'
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import InfiniteLoader from 'react-window-infinite-loader';
import ExpenseCard from './ExpenseCard';

const Row = ({ index, style, data }) => {
  const item = data[index];

  if(!item) return <div style={style} className='flex justify-center items-center animate-pulse'><p>Loading more data..</p></div>
  
  return (
      <ExpenseCard expense={item} style={style}/>
  );
};

const VirtualizedExpenseList = ({ items, loadMore, hasNextPage }) => {
  const isItemLoaded = index => !hasNextPage || index < items.length;

  if(!items) {
    return (
      <div className='w-full h-full bg-neutral-200 dark:bg-neutral-700 rounded-lg px-4 py-2.5 flex justify-center items-center text-center'>
        {/* TODO: add illustration loading here */}
        <p className='text-dark/80 dark:text-white/80 text-sm md:text-base'>Loading expense data..</p>
      </div>
    )
  }
  if(items.length === 0 && !hasNextPage) {
    return(
      <div className='w-full h-full bg-neutral-200 dark:bg-neutral-700 rounded-lg px-4 py-2.5 flex justify-center items-center text-center'>
        {/* TODO: add illustration not found here */}
        <p className='text-dark/80 dark:text-white/80 text-sm md:text-base'>No expense found..</p>
      </div>
    )
  }
  return (
    <AutoSizer>
      {({ height, width }) => (
        <InfiniteLoader
          itemCount={hasNextPage ? items.length + 1 : items.length}
          loadMoreItems={loadMore}
          isItemLoaded={isItemLoaded}
        >
          {({ onItemsRendered, ref }) => (
            <FixedSizeList
              height={height}
              width={width}
              itemCount={hasNextPage ? items.length + 1 : items.length}
              itemSize={65}
              onItemsRendered={onItemsRendered}
              ref={ref}
              itemData={items}
              className='bg-neutral-200 dark:bg-neutral-700 rounded-lg'
              style={{willChange: 'initial'}}
            >
              {Row}
            </FixedSizeList>
          )}
        </InfiniteLoader>
      )}
    </AutoSizer>
  );
};

export default VirtualizedExpenseList;