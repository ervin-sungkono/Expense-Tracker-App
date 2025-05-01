'use client'
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import InfiniteLoader from 'react-window-infinite-loader';
import ExpenseCard from './ExpenseCard';

const Row = ({ index, style, data }) => {
    const item = data[index];

    if(!item) return <>Loading data...</>
    return (
        <ExpenseCard {...item} style={style}/>
    );
};

const VirtualizedExpenseList = ({ items, loadMore, hasNextPage }) => {
  const isItemLoaded = index => !hasNextPage || index < items.length;

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