'use strict';

function swap(arr, i, j) {
    var t  = arr[j];
    arr[j] = arr[i];
    arr[i] = t;
}

function quicksort(arr, low, high) {
    if(low < high) {
        var p = partition(arr, low, high);
        quicksort(arr, low,   p - 1);
        quicksort(arr, p + 1, high);
    }
}

function partition(arr, low, high) {
    var pivot = arr[high],
        i     = low;
    for(var j = low; j < high; j++) {
        if(arr[j] <= pivot) {
            swap(arr, i, j);
            i += 1;
        }
    }

    swap(arr, i, high);
    return i;
}

function partitionCallback(arr, low, high, cb) {
    var pivot = arr[high],
        i     = low;
    for(var j = low; j < high; j++) {
        if(cb(arr[j], pivot) <= 0) {
            swap(arr, i, j);
            i += 1;
        }
    }

    swap(arr, i, high);
    return i;
}

function quicksortCallback(arr, low, high, cb) {
    if(low < high) {
        var p = partitionCallback(arr, low, high, cb);
        quicksortCallback(arr, low,   p - 1, cb);
        quicksortCallback(arr, p + 1, high, cb);
    }
}

function quicksortArray(arr, cb) {
    if(cb && typeof cb === 'function') {
        return quicksortCallback(arr, 0, arr.length - 1, cb);
    }

    quicksort(arr, 0, arr.length - 1);
}

function sortedGetInsertIndex(arr, value) {
    if(value >= arr[arr.length - 1]) {
        return arr.length;
    } else if(value <= arr[0]) {
        return 0;        
    }

    var length    = arr.length;
    var middle    = parseInt(length / 2);
    var iteration = parseInt(middle / 2);
    while(true) {
        if(value === arr[middle]) {
            return middle;
        } else if(value > arr[middle]) {
            middle += iteration;
        } else if(value < arr[middle]) {
            middle -= iteration;
        }

        if(iteration <= 1) {
            iteration = 1;
            break;
        } else {
            iteration = parseInt(iteration / 2);
        }
    }

    while(true) {
        if(middle <= 0 || middle >= length) {
            return middle;
        }

        if(value > arr[middle] && value > arr[middle + 1]) {
            middle++;
        } else if(value < arr[middle] && value < arr[middle - 1]) {
            middle--;
        } else {
            return middle;
        }
    }
}



module.exports = {
    quicksort:            quicksort,
    quicksortArray:       quicksortArray,
    sortedGetInsertIndex: sortedGetInsertIndex
};