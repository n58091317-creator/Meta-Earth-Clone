package cmd

import (
	"fmt"
	"github.com/cosmos/cosmos-sdk/server"
	"github.com/st-chain/rollapp/env"
	"os"
	"runtime"
	"runtime/pprof"
	"runtime/trace"
	"strconv"
	"time"
)

func monitorMemory(ctx *server.Context, home string) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	recordingAllocMemory := float64(0)
	//recordingSysMemory := float64(0)
	for range ticker.C {
		var memStats runtime.MemStats
		runtime.ReadMemStats(&memStats)

		allocatedGB := float64(memStats.HeapAlloc) / 1024 / 1024 / 1024
		allocatedThreshold := float64(10)

		if allocatedThresholdEnv := os.Getenv(env.ALLOC_THRESHOLD); allocatedThresholdEnv != "" {
			if value, err := strconv.ParseFloat(allocatedThresholdEnv, 10); err == nil {
				allocatedThreshold = value
			}
		}

		if allocatedGB > allocatedThreshold && allocatedGB > recordingAllocMemory*1.1 {
			ctx.Logger.Info("alloc memory usage exceeded threshold, dumping heap...", "size/GB", allocatedGB)
			recordingAllocMemory = allocatedGB
			dumpHeapProfile(ctx, home, "alloc")
			ticker.Reset(3 * time.Second) // Reset the ticker to avoid flooding with dumps
		}

		//sysAllocatedGB := float64(memStats.Sys) / 1024 / 1024 / 1024
		//sysThreshold := float64(20)
		//if sysThresholdEnv := os.Getenv(env.SYS_THRESHOLD); sysThresholdEnv != "" {
		//	if value, err := strconv.ParseFloat(sysThresholdEnv, 10); err == nil {
		//		sysThreshold = value
		//	}
		//}
		//if sysAllocatedGB > sysThreshold && sysAllocatedGB > recordingSysMemory*1.1 {
		//	ctx.Logger.Info("Sys memory usage exceeded threshold, dumping heap...", "size/GB", sysAllocatedGB)
		//	recordingSysMemory = sysAllocatedGB
		//	dumpHeapProfile(ctx, home, "sys")
		//	ticker.Reset(3 * time.Second) // Reset the ticker to avoid flooding with dumps
		//} else {
		//	ticker.Reset(300 * time.Second)
		//}
	}
}

func dumpHeapProfile(ctx *server.Context, home, event string) {
	filename := fmt.Sprintf("%s/heap/heap_%s_%s.prof", home, event, time.Now().Format("20060102_150405"))
	f, err := os.Create(filename)
	if err != nil {
		ctx.Logger.Error("cannot create heap file: ", "error", err)
		return
	}
	defer f.Close()

	//runtime.GC()

	if err := pprof.WriteHeapProfile(f); err != nil {
		ctx.Logger.Error("cannot write heap file: ", "error", err)
	}
	ctx.Logger.Info("write heap file: ", "file", filename)

	startTrace(ctx, home, event)
}

func startTrace(ctx *server.Context, home, event string) {
	filename := fmt.Sprintf("%s/heap/trace_%s_%s.out", home, event, time.Now().Format("20060102_150405"))
	f, err := os.Create(filename)
	if err != nil {
		ctx.Logger.Error("cannot create trace file: ", "error", err)
		return
	}
	defer f.Close()

	if err := trace.Start(f); err != nil {
		ctx.Logger.Error("cannot start trace: ", "error", err)
		return
	}
	defer trace.Stop()

	ctx.Logger.Info("Trace completed and written to file: ", "file", filename)
}
