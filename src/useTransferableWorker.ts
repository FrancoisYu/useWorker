import React from 'react'

const createWorkerBlobUrl = (fn: Function) => {
  const blobCode = `
      onmessage = e => {
        postMessage((${fn})(...e.data));
      }
    `

  const blob = new Blob([blobCode], { type: 'text/javascript' })
  const url = URL.createObjectURL(blob)
  return url
}

const callWorker = (
  worker: Worker,
  args: Array<any>,
  transferList: Transferable[]
) => {
  worker.postMessage(args, transferList)

  return new Promise((res, rej) => {
    worker.addEventListener('message', (e: MessageEvent) => {
      res(e.data)
    })
    worker.addEventListener('error', () => {
      rej()
    })
  })
}

function generateUUID(): string {
  return new Array(4)
    .fill(0)
    .map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16))
    .join('-')
}

interface WorkerRef extends Worker {
  _url?: string
  _id?: string
}

export const useTransferableWorker = (fn: Function) => {
  const workerRef = React.useRef<WorkerRef>()

  const generateWorker = () => {
    const workerUrl = createWorkerBlobUrl(fn)
    const worker: WorkerRef = new Worker(workerUrl)

    // Add custom properties
    worker._url = workerUrl
    worker._id = generateUUID()
    workerRef.current = worker

    return worker
  }

  const terminateWorker = () => {
    const worker = workerRef.current
    worker?.terminate()

    // Revoke shite
    if (worker?._url) {
      URL.revokeObjectURL(worker._url)
    }
  }

  const workerHook = (args: Array<any>, transferList: Transferable[]) => {
    // Generates worker
    const worker = generateWorker()
    return callWorker(worker, args, transferList)
  }

  return [workerHook, { terminateWorker }]
}
