import { Injectable } from '@angular/core';
import { Point2D } from '../utils';

@Injectable({
  providedIn: 'root',
})
export class ControlUIService {
  tooltipsActivated = true;
  showTooltip: boolean = false;
  tooltipType: string;

  showConfMat: boolean = true;

  showEdit: boolean = false;

  showMetrics: boolean = true;
  performanceMode: boolean = false;
  showScores: boolean = false;
  showPerClassMetrics: boolean = false;
  showMicroMetrics: boolean = true;
  showMacroMetrics: boolean = true;
  showNaN: boolean = false;
  showReference: boolean = true;
  showOverlayReference: boolean = true;

  showBoundaryMetric:boolean = false;
  ignoreFirstClassMetric:boolean = true

  currentPreset:number=0;
  overlayOpacity:number = 80;

  isSegmentation=true;
  isBusy=false;

  pos: Point2D = {x:-500, y:-500};

  private updateInference:() => void
  constructor() {}

  activateTooltip(event: MouseEvent, type: string) {
    this.pos = { x: event.clientX-475-event.offsetX, y: event.clientY-event.offsetY};
    this.showTooltip = true && this.tooltipsActivated;
    this.tooltipType = type;
  }
  deactivateTooltip() {
    this.showTooltip = false;
  }

  setInferenceFunction(fn: () => void){
    this.updateInference = fn

  }

  toggleCM() {
    this.showConfMat = !this.showConfMat;
  }

  toggleEdit() {
    this.showEdit = !this.showEdit;
  }

  toggleMetrics() {
    this.showMetrics = !this.showMetrics;
  }
  togglePerformanceMode() {
    this.performanceMode = !this.performanceMode;
  }
  togglePerClassMetrics() {
    this.showPerClassMetrics = !this.showPerClassMetrics;
  }
  toggleMicroMetrics() {
    this.showMicroMetrics = !this.showMicroMetrics;
  }
  toggleMacroMetrics() {
    this.showMacroMetrics = !this.showMacroMetrics;
  }
  toggleNaN() {
    this.showNaN = !this.showNaN;
  }
  toggleScores() {
    this.showScores = !this.showScores;
  }
  toggleReferenceDisplay() {
    this.showReference = !this.showReference;
  }
  toggleOverlayReference() {
    this.showOverlayReference = !this.showOverlayReference;
  }
  toggleBoundaryMetric(){
    this.showBoundaryMetric = !this.showBoundaryMetric
    this.updateInference()
  }
}
