import { Injectable } from '@angular/core';
import { Score, Stats } from '../statistic';
import { ClassesService } from './classes.service';
import { ControlUIService } from './control-ui.service';
import { DrawService } from './draw.service';
import { colorScore } from '../utils';
import {min} from "rxjs";
export interface SelectedScore {
  score: Score;
  description: string;
}
@Injectable({
  providedIn: 'root',
})
export class ScoresService {
  scores: Array<Score>;
  isMulti : boolean;
  final_multi_result: Map<number, Array<Score>>;
  visibleScores: Array<boolean>;
  confusionMatrix: Array<Array<number>>;
  stateCMatrix: Array<Array<string>>;
  selectedScores: Array<SelectedScore> = new Array<SelectedScore>();

  constructor(
    private classService: ClassesService,
    private UICtrlService: ControlUIService,
    private drawService: DrawService
  ) {
    this.final_multi_result = new Map();
  }

  getScores() {
    return this.scores;
  }

  checkIsMultiVideo(isMulti : boolean) {
    this.isMulti = isMulti;
  }

  colorScore(score:number|undefined){
    return colorScore(score);
  }

  setScores(scores: Array<Score>) {
    this.scores = scores;
    console.log('in set scores');
    this.visibleScores = new Array<boolean>(this.scores.length).fill(true);
  }

  updateScore(overlap_score: number[]) {
    let statsComputer = new Stats(
      this.confusionMatrix,
      this.UICtrlService.ignoreFirstClassMetric
    );

    let newScores = statsComputer.updateScore(overlap_score);

    if (this.scores) {
      let existingScoresNames: Array<string> = this.scores.map<string>(
        (element) => {
          return element.name;
        }
      );
      for (let i = 0; i < newScores.length; i++) {
        let name: string = newScores[i].name;
        let indexOf = existingScoresNames.indexOf(name);
        if (indexOf >= 0) {
          this.scores[indexOf].update(newScores[i]);
        } else {
          this.scores.push(newScores[i]);
        }
      }
      this.setScores(this.scores);
    } else {
      this.setScores(newScores);
    }
  }

  updateMultiScore(overlap_score: number[], i: number, video_count : number) {
    let statsComputer = new Stats(
      this.confusionMatrix,
      this.UICtrlService.ignoreFirstClassMetric
    );

    let newScores = statsComputer.updateMultiScore(overlap_score);
    let myScores = new Array<Score>();
    this.final_multi_result.set(i, newScores);

    if (this.final_multi_result.size == video_count) {
      let micro_res = Array<number>();
      for(let i=0; i<video_count; i++) {
        //TODO: take average of metrics and show them
        let item = this.final_multi_result.get(i) || [];
        console.log('item size ->' +item.length);
        for(let j=0; j<item.length; j++) {
          if(!Number.isNaN(micro_res[i])) {
            micro_res[j] += item[j].microAverage;
          } else {
            micro_res[j] = item[j].microAverage;
          }
          console.log(item[j].name);
          console.log('micro_res[j]'+micro_res[j]);
        }
      }
      for(let i=0; i<micro_res.length; i++) {
        micro_res[i] = micro_res[i]/video_count;
      }
      let item = this.final_multi_result.get(0) || [];
      for(let i=0; i<item.length; i++) {
        let args = {
          name: item[i].name,
          microAverage: micro_res[i],
          macroAverage: 0.0,
          macroWeightedAverage: 0.0,
        };
        console.log('in args');
        console.log(micro_res[i]);
        myScores.push(new Score(args));
      }
      for(let i=0; i<myScores.length; i++) {
        console.log('after calculation name of metric -> '+myScores[i].name);
        console.log(myScores[i].microAverage);
      }
      console.log('myScores -> '+myScores);
      if (this.scores) {
        let existingScoresNames: Array<string> = this.scores.map<string>(
          (element) => {
            return element.name;
          }
        );
        for (let i = 0; i < myScores.length; i++) {
          console.log('to be saved for myScores');
          let name: string = myScores[i].name;
          let indexOf = existingScoresNames.indexOf(name);
          if (indexOf >= 0) {
            this.scores[indexOf].update(myScores[i]);
          } else {
            this.scores.push(myScores[i]);
          }
        }
        console.log('this scores -> '+this.scores);
        this.setScores(this.scores);
      } else {
        this.setScores(myScores);
      }
    }
  }

  initConfMat() {
    this.confusionMatrix = new Array(this.classService.classes.length).fill(0);
    for (var i = 0; i < this.confusionMatrix.length; i++) {
      this.confusionMatrix[i] = new Array(
        this.classService.classes.length
      ).fill(0);
    }
    this.updateStateMatrix();
  }

  updateStateMatrix() {
    this.stateCMatrix = new Array<Array<string>>();

    for (let i = 0; i < this.classService.classes.length; i++) {
      let row = new Array<string>();
      for (let j = 0; j < this.classService.classes.length; j++) {
        let val = 'TN';
        if (i == this.classService.currentClass) {
          val = 'FP';
        }
        if (j == this.classService.currentClass) {
          val = 'FN';
        }
        if (
          j == this.classService.currentClass &&
          i == this.classService.currentClass
        ) {
          val = 'TP';
        }
        row.push(val);
      }
      this.stateCMatrix.push(row);
    }
  }
  updateConfusionMatrix(img1: Uint8ClampedArray, img2: Uint8ClampedArray) {
    this.initConfMat();
    this.computeConfMat(img1, img2, this.confusionMatrix);
    let overlap_score = [0.0]
    this.updateScore(overlap_score);
  }
  computeConfMatFromArray(
    pred: Array<number>,
    gt: Array<number>,
    confMat: Array<Array<number>>
  ) {
    let min_length = Math.min(pred.length, gt.length)
    for (let i = 0; i < min_length; i++) {
      let c_pred = pred[i];
      let c_gt = gt[i];
      confMat[c_pred][c_gt] += 1;
    }
  }
  updateConfusionMatrixFromArray(pred: Array<number>, gt: Array<number>) {
    this.initConfMat();
    this.computeConfMatFromArray(pred, gt, this.confusionMatrix);
    let overlap_scores = Stats.calculateOverlap(gt, pred);
    this.updateScore(overlap_scores);
  }

  updateConfusionMatrixFromArrayMultiVideos(pred: Array<number>, gt: Array<number>, i:number, video_count : number) {
    this.initConfMat();
    this.computeConfMatFromArray(pred, gt, this.confusionMatrix);
    let overlap_scores = Stats.calculateOverlap(gt, pred);
    this.updateMultiScore(overlap_scores, i, video_count);
  }

  computeConfMat(
    img1: Uint8ClampedArray,
    img2: Uint8ClampedArray,
    confMat: Array<Array<number>>
  ) {
    for (let i = 0; i < img1.length; i += 4) {
      if (
        img2[i] > 0 ||
        img2[i + 1] > 0 ||
        img2[i + 2] > 0 ||
        img1[i] > 0 ||
        img1[i + 1] > 0 ||
        img1[i + 2] > 0
      ) {
        let rgb_bg = img1.slice(i, i + 3);
        let rgb = img2.slice(i, i + 3);
        let gt_class = this.classService.getClassFromRGB(rgb_bg);
        let pred_class = this.classService.getClassFromRGB(rgb);
        if (pred_class >= 0 && gt_class >= 0) {
          confMat[pred_class][gt_class] += 1;
        } else {
          confMat[0][0] += 1;
        }
      } else {
        confMat[0][0] += 1;
      }
    }
  }

  computeBoundaryIoU(
    img1: Uint8ClampedArray,
    img2: Uint8ClampedArray,
    width: number,
    height: number,
    boundary: number = 3
  ) {
    let n_classes = this.classService.classes.length;
    let confMat = new Array(n_classes);
    for (let i = 0; i < n_classes; i++) {
      confMat[i] = new Array(n_classes).fill(0);
    }

    let kernel = this.drawService.getKernel(boundary);
    let boundary1 = this.drawService.convertImgToBoundaryRegion(
      img1,
      kernel,
      width,
      height
    );
    let boundary2 = this.drawService.convertImgToBoundaryRegion(
      img2,
      kernel,
      width,
      height
    );
    this.computeConfMat(boundary1, boundary2, confMat);
    let stat = new Stats(confMat);
    let overlap_score = [0.0]; //TODO:deneme
    let scores = stat.updateScore(overlap_score);
    scores.forEach((element) => {
      if (element.name == 'Dice' || element.name == 'IoU') {
        element.name = 'Boundary ' + element.name;
        this.scores.push(element);
      }
    });
    this.setScores(this.scores);
  }
}
